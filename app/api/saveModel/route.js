import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request) {
  try {
    const { modelName, modelData } = await request.json();

    // Validate request
    if (!modelName || !modelData) {
      return NextResponse.json(
        { error: 'Model name and data are required' },
        { status: 400 }
      );
    }

    // Create models directory if it doesn't exist
    const modelsDir = path.join(process.cwd(), 'public', 'models');
    await mkdir(modelsDir, { recursive: true });

    // Save the file
    const filePath = path.join(modelsDir, `${modelName}.json`);
    await writeFile(filePath, JSON.stringify(modelData, null, 2));

    return NextResponse.json({
      success: true,
      path: `/models/${modelName}.json`
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save model' },
      { status: 500 }
    );
  }
}