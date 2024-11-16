import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request) {
  try {
    const { modelName, modelData } = await request.json();
    
    // Validate model structure
    if (!modelData.tree || !modelData.labelEncoder) {
      throw new Error('Invalid model structure');
    }

    // Format the model data in the required structure
    const formattedModel = {
      model: {
        tree: modelData.tree
      },
      labelEncoder: {
        condition: modelData.labelEncoder
      }
    };

    // Create models directory if it doesn't exist
    const modelsDir = join(process.cwd(), 'public', 'models');
    await mkdir(modelsDir, { recursive: true });

    // Generate timestamp for unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '');
    const filename = `WM_${timestamp}.json`;
    const filePath = join(modelsDir, filename);

    // Write the formatted model to file
    await writeFile(filePath, JSON.stringify(formattedModel, null, 2));

    return NextResponse.json({ 
      message: 'Model saved successfully',
      path: `/models/${filename}`
    });

  } catch (error) {
    console.error('Error saving model:', error);
    return NextResponse.json(
      { message: 'Error saving model', error: error.message },
      { status: 500 }
    );
  }
}