import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "No audio file provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openaiApiKey) {
      console.error("OpenAI API key not found in environment variables");
      return new Response(
        JSON.stringify({ 
          error: "OpenAI API key not configured",
          details: "Please add OPENAI_API_KEY to your Supabase Edge Function environment variables"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: modelSettings, error: modelError } = await supabase
      .from('ai_model_settings')
      .select('model_name, temperature, prompt, response_format')
      .eq('service_type', 'transcription')
      .single();

    if (modelError) {
      console.error('Error fetching AI model settings:', modelError);
    }

    const modelName = modelSettings?.model_name || 'whisper-1';
    const temperature = modelSettings?.temperature !== undefined ? modelSettings.temperature.toString() : '0';
    const responseFormat = modelSettings?.response_format || 'json';

    const whisperFormData = new FormData();
    whisperFormData.append("file", audioFile);
    whisperFormData.append("model", modelName);
    whisperFormData.append("response_format", responseFormat);
    whisperFormData.append("temperature", temperature);

    const whisperResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: whisperFormData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error("OpenAI API error:", errorText);
      
      return new Response(
        JSON.stringify({ 
          error: "Transcription service error",
          details: `OpenAI API returned ${whisperResponse.status}: ${errorText}`
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const whisperResult = await whisperResponse.json();
    const transcript = whisperResult.text;

    if (!transcript) {
      return new Response(
        JSON.stringify({ 
          error: "No transcript generated",
          details: "OpenAI API did not return any text"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        transcript: transcript.trim(),
        success: true,
        language: whisperResult.language || "unknown",
        model: modelName
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Transcription error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Error processing transcription",
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});