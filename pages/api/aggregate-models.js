import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { modelPaths } = req.body;
    console.log('Received model paths:', modelPaths);

    // Read all model files from the public/models directory
    const modelsDir = path.join(process.cwd(), 'public', 'models');
    const modelFiles = await fs.promises.readdir(modelsDir);
    
    // Filter for .json files and exclude aggregated models
    const validModelFiles = modelFiles.filter(file => 
      file.endsWith('.json') && !file.startsWith('aggregated_')
    );

    console.log('Found model files:', validModelFiles);

    // Read and parse all valid model files
    const models = await Promise.all(
      validModelFiles.map(async (filename) => {
        const fullPath = path.join(modelsDir, filename);
        const data = await fs.promises.readFile(fullPath, 'utf8');
        return JSON.parse(data);
      })
    );

    console.log(`Successfully loaded ${models.length} models`);

    // Create aggregated model
    const aggregatedModel = {
      type: 'aggregated',
      timestamp: new Date().toISOString(),
      models: models,
      modelCount: models.length
    };

    // Generate unique filename for aggregated model
    const aggregatedFilename = `aggregated_${Date.now()}.json`;
    const aggregatedPath = path.join(modelsDir, aggregatedFilename);

    // Save aggregated model
    await fs.promises.writeFile(
      aggregatedPath, 
      JSON.stringify(aggregatedModel, null, 2)
    );

    console.log('Saved aggregated model to:', aggregatedPath);

    res.status(200).json({
      message: 'Models aggregated successfully',
      path: `/models/${aggregatedFilename}`,
      modelCount: models.length
    });

  } catch (error) {
    console.error('Error in aggregate-models API:', error);
    res.status(500).json({ 
      message: 'Failed to aggregate models',
      error: error.message 
    });
  }
} 