import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('Received body:', body);
    
    if (!body.modelName) {
      return NextResponse.json(
        { message: 'Missing model name' },
        { status: 400 }
      );
    }

    // Log the model data
    console.log('Model data to save:', body.modelData);

    const modelData = {
      tree: body.modelData?.tree || {},
      labelEncoder: body.modelData?.labelEncoder || {}
    };

    // Log the formatted data
    console.log('Formatted model data:', modelData);

    const formattedModel = {
      model: { tree: modelData.tree },
      labelEncoder: modelData.labelEncoder
    };

    // Log the final structure
    console.log('Final model structure:', formattedModel);

    // Create models directory if it doesn't exist
    const modelsDir = join(process.cwd(), 'public', 'models');
    await mkdir(modelsDir, { recursive: true });

    // Generate filename
    const filename = `${body.modelName}.json`;
    const filePath = join(modelsDir, filename);

    // Write the model to file
    await writeFile(filePath, JSON.stringify(formattedModel, null, 2));

    return NextResponse.json({ 
      success: true,
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