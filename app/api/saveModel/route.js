import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request) {
  try {
    const { modelName, modelData } = await request.json();
    
    const modelsDir = join(process.cwd(), 'public', 'models');
    try {
      await mkdir(modelsDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }

    const filePath = join(modelsDir, `${modelName}.json`);
    await writeFile(filePath, JSON.stringify(modelData, null, 2));

    return NextResponse.json({ 
      message: 'Model saved successfully',
      path: `/models/${modelName}.json`
    });

  } catch (error) {
    console.error('Error saving model:', error);
    return NextResponse.json(
      { 
        message: 'Error saving model', 
        error: error.message 
      },
      { status: 500 }
    );
  }
}