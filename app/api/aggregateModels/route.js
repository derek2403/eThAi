import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const modelsDir = path.join(process.cwd(), 'public', 'models');
    const modelFiles = await fs.promises.readdir(modelsDir);
    
    const validModelFiles = modelFiles.filter(file => 
      file.endsWith('.json') && !file.startsWith('aggregated_')
    );

    const models = await Promise.all(
      validModelFiles.map(async (filename) => {
        const fullPath = path.join(modelsDir, filename);
        const data = await fs.promises.readFile(fullPath, 'utf8');
        return JSON.parse(data);
      })
    );

    const aggregatedModel = {
      type: 'aggregated',
      timestamp: new Date().toISOString(),
      models: models,
      modelCount: models.length
    };

    const aggregatedFilename = `aggregated_${Date.now()}.json`;
    const aggregatedPath = path.join(modelsDir, aggregatedFilename);

    await fs.promises.writeFile(
      aggregatedPath, 
      JSON.stringify(aggregatedModel, null, 2)
    );

    return NextResponse.json({
      message: 'Models aggregated successfully',
      path: `/models/${aggregatedFilename}`,
      modelCount: models.length
    });

  } catch (error) {
    console.error('Error in aggregate-models API:', error);
    return NextResponse.json(
      { 
        message: 'Failed to aggregate models',
        error: error.message 
      },
      { status: 500 }
    );
  }
}