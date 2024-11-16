export class DecisionTree {
  constructor(data) {
    this.data = data;
  }

  train() {
    try {
      // Extract features and target from data
      const features = this.data.map(row => [
        Number(row[0]), // First feature
        Number(row[1]), // Second feature
        Number(row[2])  // Third feature
      ]);

      const target = this.data.map(row => Number(row[3]));

      // For this simplified version, we'll use average prediction
      const prediction = new Array(target.length).fill(
        target.reduce((a, b) => a + b, 0) / target.length
      );

      // Calculate metrics
      const mse = this.calculateMSE(target, prediction);
      const rmse = Math.sqrt(mse);
      const rSquared = this.calculateR2(target, prediction);

      console.log('Training metrics:', { mse, rmse, rSquared });

      return {
        mse,
        rmse,
        rSquared,
        features: features.length,
        samples: target.length
      };
    } catch (error) {
      console.error('Training error:', error);
      return {
        mse: 0,
        rmse: 0,
        rSquared: 0,
        features: 0,
        samples: 0
      };
    }
  }

  calculateMSE(actual, predicted) {
    if (!actual || !predicted || actual.length === 0) return 0;
    
    const sum = actual.reduce((acc, val, i) => {
      const diff = val - predicted[i];
      return acc + (diff * diff);
    }, 0);
    
    return sum / actual.length;
  }

  calculateR2(actual, predicted) {
    if (!actual || !predicted || actual.length === 0) return 0;
    
    const mean = actual.reduce((a, b) => a + b) / actual.length;
    
    const totalSS = actual.reduce((ss, yi) => {
      return ss + Math.pow(yi - mean, 2);
    }, 0);
    
    const residualSS = actual.reduce((ss, yi, i) => {
      return ss + Math.pow(yi - predicted[i], 2);
    }, 0);

    return totalSS === 0 ? 0 : 1 - (residualSS / totalSS);
  }
}