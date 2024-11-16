import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Validation constants
const VALID_INPUT_PATTERN = /Today is (\d+(?:\.\d+)?) degree celsius with (\d+(?:\.\d+)?)% humidity in (\w+)/i;

const MONTH_MAP = {
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

const FEATURE_RANGES = {
  temperature: { min: 5.1, max: 22.5 },
  humidity: { min: 40, max: 86 },
  month: { min: 1, max: 4 }
};

// Simple rule-based fallback prediction
function getFallbackPrediction(userInput) {
  const input = userInput.toLowerCase();
  
  // Check for weather-related keywords
  const hasRainKeywords = input.match(/rain|wet|storm|thunder|shower/);
  const hasSunKeywords = input.match(/sun|hot|warm|bright|clear/);
  const hasCloudKeywords = input.match(/cloud|overcast|grey|gray|dim/);
  
  // Default weights for each condition
  let weights = {
    'Rain': hasRainKeywords ? 2 : 1,
    'Sunny': hasSunKeywords ? 2 : 1,
    'Cloudy': hasCloudKeywords ? 2 : 1
  };
  
  // Add seasonal biases
  const currentMonth = new Date().getMonth() + 1; // 1-12
  
  // Adjust weights based on season
  if (currentMonth >= 3 && currentMonth <= 5) { // Spring
    weights.Sunny *= 1.2;
    weights.Rain *= 1.1;
  } else if (currentMonth >= 6 && currentMonth <= 8) { // Summer
    weights.Sunny *= 1.5;
    weights.Rain *= 0.8;
  } else if (currentMonth >= 9 && currentMonth <= 11) { // Fall
    weights.Cloudy *= 1.3;
    weights.Rain *= 1.2;
  } else { // Winter
    weights.Cloudy *= 1.4;
    weights.Rain *= 1.3;
    weights.Sunny *= 0.7;
  }
  
  // Find the condition with highest weight
  const prediction = Object.entries(weights)
    .reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    
  return {
    prediction,
    confidence: 30, // Lower confidence for fallback predictions
    isFallback: true
  };
}

function extractWeatherParameters(userInput) {
  if (!userInput || typeof userInput !== 'string') {
    throw new Error('Input must be a non-empty string');
  }

  const match = userInput.match(VALID_INPUT_PATTERN);
  if (!match) {
    throw new Error('Invalid input format');
  }

  const [_, tempStr, humidityStr, monthStr] = match;
  const temperature = parseFloat(tempStr);
  const humidity = parseFloat(humidityStr);
  const monthLower = monthStr.toLowerCase();
  const month = MONTH_MAP[monthLower];

  if (!month) {
    throw new Error('Invalid month format');
  }

  return {
    temperature: Math.min(Math.max(temperature, FEATURE_RANGES.temperature.min), FEATURE_RANGES.temperature.max),
    humidity: Math.min(Math.max(humidity, FEATURE_RANGES.humidity.min), FEATURE_RANGES.humidity.max),
    month: Math.min(Math.max(month, FEATURE_RANGES.month.min), FEATURE_RANGES.month.max)
  };
}

function predictWithTree(tree, input) {
  if (!tree || !tree.feature) {
    return tree?.value ?? null;
  }

  const featureValue = input[tree.feature];
  if (featureValue === undefined) {
    throw new Error(`Missing required feature: ${tree.feature}`);
  }

  return featureValue <= tree.threshold
    ? predictWithTree(tree.left, input)
    : predictWithTree(tree.right, input);
}

export async function POST(request) {
  try {
    if (!request.body) {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { naturalLanguageInput } = body;

    if (!naturalLanguageInput) {
      return NextResponse.json(
        { error: 'naturalLanguageInput is required' },
        { status: 400 }
      );
    }

    let result;
    
    try {
      // Try to use the machine learning model first
      const weatherParams = extractWeatherParameters(naturalLanguageInput);
      const modelsDir = path.join(process.cwd(), 'public', 'models');
      const modelFiles = await fs.readdir(modelsDir);
      const treeFiles = modelFiles.filter(file => file.startsWith('WM_'));

      if (treeFiles.length === 0) {
        // If no models found, use fallback
        result = getFallbackPrediction(naturalLanguageInput);
      } else {
        const models = await Promise.all(
          treeFiles.map(async (filename) => {
            const filePath = path.join(modelsDir, filename);
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
          })
        );

        const predictions = await Promise.all(
          models.map(async (model) => {
            if (!model?.model?.tree || !model?.labelEncoder?.condition) {
              return null;
            }
            try {
              const value = await predictWithTree(model.model.tree, weatherParams);
              const labels = model.labelEncoder.condition;
              return Object.keys(labels).find(key => labels[key] === value);
            } catch (error) {
              console.error('Prediction failed for model:', error);
              return null;
            }
          })
        );

        const validPredictions = predictions.filter(Boolean);
        
        if (validPredictions.length === 0) {
          // If all predictions failed, use fallback
          result = getFallbackPrediction(naturalLanguageInput);
        } else {
          const labelCounts = validPredictions.reduce((acc, label) => {
            acc[label] = (acc[label] || 0) + 1;
            return acc;
          }, {});

          const [finalPrediction, maxCount] = Object.entries(labelCounts)
            .reduce((a, b) => (b[1] > a[1] ? b : a));

          const confidence = (maxCount / validPredictions.length) * 100;

          result = {
            prediction: finalPrediction,
            confidence: confidence.toFixed(1),
            parameters: weatherParams,
            details: {
              totalTrees: validPredictions.length,
              voteCounts: labelCounts,
              predictions: validPredictions
            }
          };
        }
      }
    } catch (error) {
      // If any error occurs during ML prediction, use fallback
      console.error('Using fallback due to error:', error);
      result = getFallbackPrediction(naturalLanguageInput);
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Prediction error:', error);
    // Even if everything fails, still return a prediction
    const fallback = getFallbackPrediction('default');
    return NextResponse.json({
      ...fallback,
      error: error.message || 'An unexpected error occurred'
    });
  }
}