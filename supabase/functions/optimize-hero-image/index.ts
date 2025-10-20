const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get('url');
    const width = parseInt(url.searchParams.get('width') || '1920');
    const quality = parseInt(url.searchParams.get('quality') || '75');

    if (!imageUrl) {
      return new Response('Missing url parameter', {
        status: 400,
        headers: corsHeaders,
      });
    }

    console.log(`Fetching image: ${imageUrl}`);
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    console.log(`Original image size: ${imageBuffer.byteLength} bytes`);

    // For now, just pass through the image
    // In production, use an image processing library like sharp or ImageMagick
    // Note: Deno Deploy doesn't support native image processing libraries well
    // Best approach: Use Supabase's built-in transformation or external service
    
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    
    return new Response(imageBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error: any) {
    console.error('Error optimizing image:', error);
    return new Response(error.message, {
      status: 500,
      headers: corsHeaders,
    });
  }
});