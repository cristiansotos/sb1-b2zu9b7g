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
        JSON.stringify({
          error: "No se proporcionó archivo de audio",
          details: "El archivo de audio es requerido para la transcripción"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate file size (max 25MB for Whisper API)
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    if (audioFile.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          error: "Archivo demasiado grande",
          details: `El archivo excede el tamaño máximo de 25MB (tamaño actual: ${(audioFile.size / 1024 / 1024).toFixed(2)}MB)`
        }),
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
          error: "Configuración del servicio incompleta",
          details: "La clave API de OpenAI no está configurada. Contacta al administrador."
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

      let userMessage = "Error del servicio de transcripción";
      let details = errorText;

      if (whisperResponse.status === 429) {
        userMessage = "Límite de solicitudes excedido";
        details = "Demasiadas solicitudes. Por favor, espera unos minutos e intenta de nuevo.";
      } else if (whisperResponse.status === 401) {
        userMessage = "Error de autenticación";
        details = "Problema con la configuración de la API. Contacta al administrador.";
      } else if (whisperResponse.status >= 500) {
        userMessage = "Servicio temporalmente no disponible";
        details = "El servicio de transcripción no está disponible. Intenta de nuevo más tarde.";
      }

      return new Response(
        JSON.stringify({
          error: userMessage,
          details: details
        }),
        {
          status: whisperResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const whisperResult = await whisperResponse.json();
    const transcript = whisperResult.text;

    if (!transcript) {
      return new Response(
        JSON.stringify({
          error: "No se generó transcripción",
          details: "El audio no contiene contenido transcribible o es demasiado corto"
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

    let userMessage = "Error al procesar la transcripción";
    let details = error.message;

    // Check for common error types
    if (error.name === "NetworkError" || error.message.includes("fetch")) {
      userMessage = "Error de conexión";
      details = "No se pudo conectar al servicio de transcripción. Verifica tu conexión a internet.";
    } else if (error.message.includes("timeout")) {
      userMessage = "Tiempo de espera agotado";
      details = "La transcripción tomó demasiado tiempo. Intenta con un audio más corto.";
    }

    return new Response(
      JSON.stringify({
        error: userMessage,
        details: details
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});