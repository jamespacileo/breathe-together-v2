/**
 * Gemini Visual Evaluator
 *
 * Integrates Gemini Flash 3 API for AI-powered visual evaluation of rendered scenes.
 * Provides semi-deterministic scoring using a structured rubric.
 */

export interface EvaluationCriteria {
  score: number;
  note: string;
}

export interface VisualEvaluationReport {
  lighting: EvaluationCriteria;
  composition: EvaluationCriteria;
  colorHarmony: EvaluationCriteria;
  depth: EvaluationCriteria;
  polish: EvaluationCriteria;
  overall: number;
  timestamp: string;
}

const GEMINI_PROMPT = `You are an expert visual evaluator for 3D meditation scenes. Evaluate the following image against these criteria. Score each from 1-10. Respond ONLY with valid JSON, no markdown code fences.

Criteria:
1. Lighting Quality: Warm, balanced, no harsh shadows. Sunset-like soft lighting is ideal.
2. Composition: Scene elements (sun on side, particle shards in center, constellations in background) are visible and well-framed.
3. Color Harmony: Palette is cohesive, calming, and aesthetically pleasing. Warm oranges, soft blues, and subtle purples are expected.
4. Depth & Atmosphere: Scene feels immersive and layered, not flat. Clear foreground, midground, and background separation.
5. Visual Polish: No glitches, artifacts, or rendering errors. Clean edges and smooth gradients.

Response format (JSON only):
{
  "lighting": { "score": 7, "note": "brief justification" },
  "composition": { "score": 8, "note": "brief justification" },
  "colorHarmony": { "score": 9, "note": "brief justification" },
  "depth": { "score": 7, "note": "brief justification" },
  "polish": { "score": 10, "note": "brief justification" },
  "overall": 8.2
}`;

/**
 * Evaluates a scene image using Gemini Flash 3.
 *
 * @param imageBase64 - Base64 encoded PNG image data
 * @param referenceImages - Optional reference images for context
 * @returns Visual evaluation report with scores and notes
 */
export async function evaluateWithGemini(
  imageBase64: string,
  referenceImages?: string[],
): Promise<VisualEvaluationReport | null> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log('GEMINI_API_KEY not set, skipping AI evaluation');
    return null;
  }

  const imageParts = [
    {
      inlineData: {
        mimeType: 'image/png',
        data: imageBase64,
      },
    },
  ];

  // Add reference images if provided
  if (referenceImages && referenceImages.length > 0) {
    for (const refImage of referenceImages) {
      imageParts.push({
        inlineData: {
          mimeType: 'image/png',
          data: refImage,
        },
      });
    }
  }

  const requestBody = {
    contents: [
      {
        parts: [{ text: GEMINI_PROMPT }, ...imageParts],
      },
    ],
    generationConfig: {
      temperature: 0.1, // Low temperature for consistency
      topP: 0.8,
      topK: 10,
      maxOutputTokens: 1024,
    },
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      console.error('Gemini API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      console.error('No text content in Gemini response');
      return null;
    }

    // Parse JSON response (handle potential markdown code fences)
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Could not parse JSON from Gemini response:', textContent);
      return null;
    }

    const evaluation = JSON.parse(jsonMatch[0]) as Omit<VisualEvaluationReport, 'timestamp'>;
    return {
      ...evaluation,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Gemini evaluation failed:', error);
    return null;
  }
}

/**
 * Formats the evaluation report for console output.
 */
export function formatReport(report: VisualEvaluationReport): string {
  const lines = [
    '╔══════════════════════════════════════════════════════╗',
    '║           VISUAL EVALUATION REPORT                   ║',
    '╠══════════════════════════════════════════════════════╣',
    `║ Lighting:       ${report.lighting.score}/10  ${report.lighting.note.slice(0, 30).padEnd(30)}`,
    `║ Composition:    ${report.composition.score}/10  ${report.composition.note.slice(0, 30).padEnd(30)}`,
    `║ Color Harmony:  ${report.colorHarmony.score}/10  ${report.colorHarmony.note.slice(0, 30).padEnd(30)}`,
    `║ Depth:          ${report.depth.score}/10  ${report.depth.note.slice(0, 30).padEnd(30)}`,
    `║ Polish:         ${report.polish.score}/10  ${report.polish.note.slice(0, 30).padEnd(30)}`,
    '╠══════════════════════════════════════════════════════╣',
    `${`║ OVERALL SCORE:  ${report.overall.toFixed(1)}/10`.padEnd(55)}║`,
    '╚══════════════════════════════════════════════════════╝',
    `Generated: ${report.timestamp}`,
  ];
  return lines.join('\n');
}
