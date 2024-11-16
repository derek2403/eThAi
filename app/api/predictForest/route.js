import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

async function predictWithTree(tree, input) {
  if (!tree.feature) {
    return tree.value;
  }
  const featureValue = input[tree.feature];
  if (featureValue <= tree.threshold) {
    return predictWithTree(tree.left, input);
  } else {
    return predictWithTree(tree.right, input);
  }
}

async function extractWeatherParameters(userInput) {
  const pattern = /Today is (\d+(?:\.\d+)?) degree celcuis with (\d+(?:\.\d+)?)% humidity in (\w+)/i;
  
  const monthMap = {
    'jan': 1, 'january': 1,
    'feb': 2, 'february': 2,
    'mar': 3, 'march': 3,
    'apr': 4, 'april': 4,
    'may': 5,
    'jun': 6, 'june': 6,
    'jul': 7, 'july': 7,
    'aug': 8, 'august': 8,
    'sep': 9, 'september': 9,
    'oct': 10, 'october': 10,
    'nov': 11, 'november': 11,
    'dec': 12, 'december': 12
  };

  const match = userInput.match(pattern);
  if (!match) {
    throw new Error('Invalid input format. Please use: "Today is X degree celcuis with Y% humidity in Z"');
  }

  const temperature = parseFloat(match[1]);
  const humidity = parseFloat(match[2]);
  const monthStr = match[3].toLowerCase();
  const month = monthMap[monthStr];

  if (!month) {
    throw new Error('Invalid month format');
  }

  const featureRanges = {
    temperature: { min: 5.1, max: 22.5 },
    humidity: { min: 40, max: 86 },
    month: { min: 1, max: 4 }
  };

  return {
    temperature: Math.min(Math.max(temperature, featureRanges.temperature.min), featureRanges.temperature.max),
    humidity: Math.min(Math.max(humidity, featureRanges.humidity.min), featureRanges.humidity.max),
    month: Math.min(Math.max(month, featureRanges.month.min), featureRanges.month.max)
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { input, naturalLanguageInput } = body;

    let weatherParams = input;
    if (naturalLanguageInput) {
      weatherParams = await extractWeatherParameters(naturalLanguageInput);
    }

    const modelsDir = path.join(process.cwd(), 'public', 'models');
    const modelFiles = await fs.readdir(modelsDir);
    const treeFiles = modelFiles.filter(file => file.startsWith('WM_'));

    const models = await Promise.all(
      treeFiles.map(async (filename) => {
        try {
          const data = await fs.readFile(path.join(modelsDir, filename), 'utf8');
          const model = JSON.parse(data);
          
          // Validate model structure
          if (!model?.model?.tree) {
            console.error(`Invalid model structure in ${filename}:`, model);
            throw new Error(`Invalid model structure in ${filename}`);
          }
          
          return model;
        } catch (error) {
          console.error(`Error loading model ${filename}:`, error);
          throw error;
        }
      })
    );

    // Add validation before predictions
    if (!models || models.length === 0) {
      throw new Error('No valid models found');
    }

    const predictions = await Promise.all(
      models.map(async (model) => {
        if (!model?.model?.tree || !model?.labelEncoder?.condition) {
          console.error('Invalid model structure:', model);
          throw new Error('Invalid model structure');
        }
        
        const value = await predictWithTree(model.model.tree, weatherParams);
        const labels = model.labelEncoder.condition;
        return Object.keys(labels).find(key => labels[key] === value);
      })
    );

    const labelCounts = predictions.reduce((acc, label) => {
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});

    const finalPrediction = Object.entries(labelCounts)
      .reduce((a, b) => (b[1] > a[1] ? b : a))[0];

    const confidence = (labelCounts[finalPrediction] / predictions.length) * 100;

    return NextResponse.json({
      prediction: finalPrediction,
      confidence: confidence.toFixed(1),
      parameters: weatherParams,
      details: {
        totalTrees: predictions.length,
        voteCounts: labelCounts,
        predictions: predictions
      }
    });

  } catch (error) {
    console.error('Prediction error:', error);
    return NextResponse.json(
      { message: 'Prediction failed', error: error.message },
      { status: 500 }
    );
  }
}