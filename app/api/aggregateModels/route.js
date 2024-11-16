import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request) {
  try {
    // Read all model files from the public/models directory
    const modelsDir = path.join(process.cwd(), 'public', 'models');
    const modelFiles = await fs.readdir(modelsDir);
    
    // Filter for WM_ files (individual tree models)
    const treeFiles = modelFiles.filter(file => 
      file.startsWith('WM_') && file.endsWith('.json')
    );

    if (treeFiles.length === 0) {
      throw new Error('No tree models found to aggregate');
    }

    // Read and parse all tree models
    const trees = await Promise.all(
      treeFiles.map(async (filename) => {
        const data = await fs.readFile(path.join(modelsDir, filename), 'utf8');
        const model = JSON.parse(data);
        
        // Validate model structure
        if (!model.model?.tree || !model.labelEncoder?.condition) {
          throw new Error(`Invalid model structure in ${filename}`);
        }
        
        return model;
      })
    );

    // Create random forest model structure
    const randomForestModel = {
      model: {
        trees: trees.map(tree => ({
          tree: tree.model.tree
        }))
      },
      labelEncoder: {
        condition: trees[0].labelEncoder.condition // Use encoder from first tree
      },
      metadata: {
        type: 'random_forest',
        numberOfTrees: trees.length,
        createdAt: new Date().toISOString(),
        treeFiles: treeFiles
      }
    };

    // Save random forest model
    const forestFilename = `RF_${Date.now()}.json`;
    const forestPath = path.join(modelsDir, forestFilename);

    await fs.writeFile(
      forestPath, 
      JSON.stringify(randomForestModel, null, 2)
    );

    // Store in localStorage format
    const localStorageModel = {
      model: { trees: randomForestModel.model.trees },
      labelEncoder: { condition: randomForestModel.labelEncoder.condition }
    };

    return NextResponse.json({
      message: 'Random forest model created successfully',
      path: `/models/${forestFilename}`,
      treeCount: trees.length,
      localStorageModel
    });

  } catch (error) {
    console.error('Error creating random forest:', error);
    return NextResponse.json(
      { message: 'Failed to create random forest', error: error.message },
      { status: 500 }
    );
  }
} 