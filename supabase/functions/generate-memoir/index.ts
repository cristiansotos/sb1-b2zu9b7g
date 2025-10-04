import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const { transcripts, question } = await req.json()

    if (!transcripts || !Array.isArray(transcripts) || transcripts.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "No transcripts provided",
          insufficient: true 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Get OpenAI API key from environment variables
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY")
    
    if (!openaiApiKey) {
      console.error("OpenAI API key not found in environment variables")
      return new Response(
        JSON.stringify({ 
          error: "OpenAI API key not configured",
          details: "Please add OPENAI_API_KEY to your Supabase Edge Function environment variables"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Initialize Supabase client to get model configuration
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get model configuration from database
    const { data: modelConfig, error: modelError } = await supabase
      .from('ai_model_settings')
      .select('model_name')
      .eq('service_name', 'text_generation')
      .single()

    if (modelError) {
      console.error("Error fetching model configuration:", modelError)
      return new Response(
        JSON.stringify({ 
          error: "Failed to fetch model configuration",
          details: modelError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const modelName = modelConfig?.model_name || "gpt-4o-mini" // fallback to default

    // Combine all transcripts for the question
    const combinedTranscript = transcripts.join(" ")

    // Check if content is sufficient (at least 10 words)
    const wordCount = combinedTranscript.trim().split(/\s+/).length
    if (wordCount < 10) {
      return new Response(
        JSON.stringify({ 
          error: "Insufficient content for AI processing",
          insufficient: true,
          originalText: combinedTranscript
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Create the prompt for memoir generation
    const prompt = `Eres un escritor especializado en memorias familiares. Tu tarea es transformar transcripciones de audio en texto narrativo coherente y emotivo, manteniendo la voz auténtica de la persona.

INSTRUCCIONES IMPORTANTES:
- Mantén la voz en primera persona
- Preserva todos los hechos, nombres, fechas y detalles específicos mencionados
- NO inventes información que no esté en la transcripción
- Mejora la fluidez y coherencia del texto
- Corrige errores gramaticales y de puntuación
- Mantén el tono emocional original
- Si hay repeticiones, consolídalas de manera natural
- Usa un lenguaje cálido y personal apropiado para memorias familiares

PREGUNTA: ${question}

TRANSCRIPCIÓN A PROCESAR:
${combinedTranscript}

Transforma esta transcripción en un texto narrativo coherente y emotivo para las memorias familiares:`

    // Call OpenAI GPT API with the configured model
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName, // Use the model from database configuration
        messages: [
          {
            role: "system",
            content: "Eres un escritor especializado en memorias familiares que transforma transcripciones de audio en narrativas coherentes y emotivas."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_completion_tokens: 1000,
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error("OpenAI API error:", errorText)
      
      return new Response(
        JSON.stringify({ 
          error: "AI service error",
          details: `OpenAI API returned ${openaiResponse.status}: ${errorText}`,
          originalText: combinedTranscript,
          modelUsed: modelName
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const openaiResult = await openaiResponse.json()
    const generatedText = openaiResult.choices?.[0]?.message?.content

    if (!generatedText) {
      return new Response(
        JSON.stringify({ 
          error: "No text generated by AI",
          details: "OpenAI API did not return any generated text",
          originalText: combinedTranscript,
          modelUsed: modelName
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        generatedText: generatedText.trim(),
        originalText: combinedTranscript,
        success: true,
        modelUsed: modelName
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )

  } catch (error) {
    console.error("Memoir generation error:", error)
    
    return new Response(
      JSON.stringify({ 
        error: "Error processing memoir generation",
        details: error.message 
      }),
      {
        status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})