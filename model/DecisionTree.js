class DecisionNode {
    constructor(feature = null, threshold = null, left = null, right = null, value = null, samples = null, mse = null) {
      this.feature = feature;           // Index of the feature to split on
      this.threshold = threshold;       // Threshold value for the split
      this.left = left;                // Left child node
      this.right = right;              // Right child node
      this.value = value;              // Prediction value (for leaf nodes)
      this.samples = samples;          // Number of samples at this node
      this.mse = mse;                  // Mean squared error at this node
    }
  }
  
  export class DecisionTreeRegressor {
    constructor(maxDepth = 5, minSamplesSplit = 2, minMseReduction = 0.0001) {
      this.maxDepth = maxDepth;
      this.minSamplesSplit = minSamplesSplit;
      this.minMseReduction = minMseReduction;
      this.root = null;
      this.featureNames = null;
      this.nFeatures = null;
    }
  
    // Calculate mean squared error
    calculateMSE(y) {
      if (y.length === 0) return 0;
      const mean = y.reduce((a, b) => a + b) / y.length;
      return y.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / y.length;
    }
  
    // Calculate mean value
    calculateMean(y) {
      return y.reduce((a, b) => a + b) / y.length;
    }
  
    // Find best split for a feature
    findBestSplitForFeature(X, y, feature) {
      const values = X.map(row => row[feature]);
      const sortedIndices = Array.from(Array(values.length).keys())
        .sort((a, b) => values[a] - values[b]);
      
      let bestGain = 0;
      let bestThreshold = null;
      const parentMSE = this.calculateMSE(y);
      let bestLeftY = null;
      let bestRightY = null;
      
      for (let i = 0; i < sortedIndices.length - 1; i++) {
        const threshold = (values[sortedIndices[i]] + values[sortedIndices[i + 1]]) / 2;
        
        const leftY = [];
        const rightY = [];
        
        for (let j = 0; j < X.length; j++) {
          if (X[j][feature] <= threshold) {
            leftY.push(y[j]);
          } else {
            rightY.push(y[j]);
          }
        }
        
        if (leftY.length < this.minSamplesSplit || rightY.length < this.minSamplesSplit) {
          continue;
        }
        
        const leftMSE = this.calculateMSE(leftY);
        const rightMSE = this.calculateMSE(rightY);
        const weightedMSE = (leftY.length * leftMSE + rightY.length * rightMSE) / y.length;
        const gain = parentMSE - weightedMSE;
        
        if (gain > bestGain) {
          bestGain = gain;
          bestThreshold = threshold;
          bestLeftY = leftY;
          bestRightY = rightY;
        }
      }
      
      return { bestGain, bestThreshold, bestLeftY, bestRightY };
    }
  
    // Find best split across all features
    findBestSplit(X, y) {
      let bestFeature = null;
      let bestThreshold = null;
      let bestGain = -Infinity;
      let bestLeftY = null;
      let bestRightY = null;
      let bestLeftX = null;
      let bestRightX = null;
  
      for (let feature = 0; feature < this.nFeatures; feature++) {
        const { bestGain: gain, bestThreshold: threshold, bestLeftY: leftY, bestRightY: rightY } = 
          this.findBestSplitForFeature(X, y, feature);
        
        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = feature;
          bestThreshold = threshold;
          bestLeftY = leftY;
          bestRightY = rightY;
          
          bestLeftX = X.filter(row => row[feature] <= threshold);
          bestRightX = X.filter(row => row[feature] > threshold);
        }
      }
  
      return {
        feature: bestFeature,
        threshold: bestThreshold,
        gain: bestGain,
        leftX: bestLeftX,
        leftY: bestLeftY,
        rightX: bestRightX,
        rightY: bestRightY
      };
    }
  
    // Build tree recursively
    buildTree(X, y, depth = 0) {
      const nSamples = y.length;
      const mse = this.calculateMSE(y);
      
      // Check stopping criteria
      if (depth >= this.maxDepth || 
          nSamples < this.minSamplesSplit || 
          mse < this.minMseReduction) {
        return new DecisionNode(
          null,
          null,
          null,
          null,
          this.calculateMean(y),
          nSamples,
          mse
        );
      }
      
      // Find best split
      const split = this.findBestSplit(X, y);
      
      // If no good split found, make leaf node
      if (split.feature === null || split.gain < this.minMseReduction) {
        return new DecisionNode(
          null,
          null,
          null,
          null,
          this.calculateMean(y),
          nSamples,
          mse
        );
      }
      
      // Create child nodes
      const left = this.buildTree(split.leftX, split.leftY, depth + 1);
      const right = this.buildTree(split.rightX, split.rightY, depth + 1);
      
      return new DecisionNode(
        split.feature,
        split.threshold,
        left,
        right,
        null,
        nSamples,
        mse
      );
    }
  
    // Fit the model
    fit(X, y, featureNames = null) {
      // Validate inputs
      if (!Array.isArray(X) || !Array.isArray(y)) {
        throw new Error('X and y must be arrays');
      }
      if (X.length !== y.length) {
        throw new Error('X and y must have the same length');
      }
      if (X.length === 0) {
        throw new Error('Empty dataset');
      }
      
      this.nFeatures = X[0].length;
      this.featureNames = featureNames || 
        Array.from({length: this.nFeatures}, (_, i) => `feature_${i}`);
      
      // Build the tree
      this.root = this.buildTree(X, y);
      return this;
    }
  
    // Make predictions
    predict(X) {
      if (!this.root) {
        throw new Error('Model not trained yet');
      }
      return Array.isArray(X[0]) ? X.map(x => this._predictSingle(x)) : this._predictSingle(X);
    }
  
    // Predict single sample
    _predictSingle(x, node = this.root) {
      if (node.value !== null) {
        return node.value;
      }
      
      if (x[node.feature] <= node.threshold) {
        return this._predictSingle(x, node.left);
      } else {
        return this._predictSingle(x, node.right);
      }
    }
  
    // Convert model to JSON
    toJSON() {
      return {
        maxDepth: this.maxDepth,
        minSamplesSplit: this.minSamplesSplit,
        minMseReduction: this.minMseReduction,
        featureNames: this.featureNames,
        tree: this._nodeToJSON(this.root)
      };
    }
  
    // Convert node to JSON
    _nodeToJSON(node) {
      if (!node) return null;
      
      return {
        feature: node.feature !== null ? this.featureNames[node.feature] : null,
        threshold: node.threshold,
        value: node.value,
        samples: node.samples,
        mse: node.mse,
        left: this._nodeToJSON(node.left),
        right: this._nodeToJSON(node.right)
      };
    }
  
    // Load model from JSON
    static fromJSON(json) {
      const model = new DecisionTreeRegressor(
        json.maxDepth,
        json.minSamplesSplit,
        json.minMseReduction
      );
      model.featureNames = json.featureNames;
      model.root = model._JSONToNode(json.tree);
      return model;
    }
  
    // Convert JSON to node
    _JSONToNode(json) {
      if (!json) return null;
      
      return new DecisionNode(
        json.feature !== null ? this.featureNames.indexOf(json.feature) : null,
        json.threshold,
        this._JSONToNode(json.left),
        this._JSONToNode(json.right),
        json.value,
        json.samples,
        json.mse
      );
    }
  }
  
  export class DecisionTree {
    constructor(data) {
      this.data = data;
      this.categoricalFeatures = new Set(['condition']); // Add categorical feature names
      this.featureEncodings = {};
    }
  
    // Encode categorical values to numbers
    encodeCategoricalFeatures(data) {
      const encodedData = [];
      
      // Initialize encodings for categorical features
      this.categoricalFeatures.forEach(feature => {
        if (!this.featureEncodings[feature]) {
          const uniqueValues = [...new Set(data.map(row => row[feature]))];
          this.featureEncodings[feature] = {};
          uniqueValues.forEach((value, index) => {
            this.featureEncodings[feature][value] = index;
          });
        }
      });
  
      // Encode the data
      data.forEach(row => {
        const encodedRow = {};
        Object.keys(row).forEach(feature => {
          if (this.categoricalFeatures.has(feature)) {
            encodedRow[feature] = this.featureEncodings[feature][row[feature]];
          } else {
            encodedRow[feature] = parseFloat(row[feature]);
          }
        });
        encodedData.push(encodedRow);
      });
  
      return encodedData;
    }
  
    train() {
      try {
        // Encode categorical features
        const encodedData = this.encodeCategoricalFeatures(this.data);
        console.log('Encoded data sample:', encodedData[0]);
  
        // Convert data to numerical arrays
        const X = [];
        const y = [];
        
        // Get feature names (excluding the target variable 'condition')
        const features = Object.keys(encodedData[0]).filter(key => key !== 'condition');
        this.features = features; // Store features for later use
        
        // Store feature ranges for normalization
        this.featureRanges = {};
        features.forEach(feature => {
          const values = encodedData.map(row => row[feature]);
          this.featureRanges[feature] = {
            min: Math.min(...values),
            max: Math.max(...values)
          };
        });
  
        // Prepare X and y
        encodedData.forEach(row => {
          const featureValues = features.map(feature => row[feature]);
          X.push(featureValues);
          y.push(row.condition);
        });
  
        // Train the model
        this.model = new DecisionTreeRegressor();
        this.model.fit(X, y, features);
  
        // Make predictions and calculate metrics
        const predictions = this.model.predict(X);
        const mse = this.calculateMSE(y, predictions);
        const rmse = Math.sqrt(mse);
        const rSquared = this.calculateRSquared(y, predictions);
  
        // Store metrics
        this.metrics = { mse, rmse, rSquared };
        this.samples = X.length;
  
        return {
          mse,
          rmse,
          rSquared,
          features,
          samples: X.length,
          featureEncodings: this.featureEncodings
        };
      } catch (error) {
        console.error('Training error:', error);
        throw error;
      }
    }
  
    calculateMSE(actual, predicted) {
      if (actual.length !== predicted.length) {
        throw new Error('Arrays must have same length');
      }
      const sum = actual.reduce((acc, val, i) => acc + Math.pow(val - predicted[i], 2), 0);
      return sum / actual.length;
    }
  
    calculateRSquared(actual, predicted) {
      const meanActual = actual.reduce((a, b) => a + b) / actual.length;
      const totalSS = actual.reduce((acc, val) => acc + Math.pow(val - meanActual, 2), 0);
      const residualSS = actual.reduce((acc, val, i) => acc + Math.pow(val - predicted[i], 2), 0);
      return 1 - (residualSS / totalSS);
    }
  
    toJSON() {
      if (!this.model) {
        throw new Error('Model not trained yet');
      }
  
      return {
        modelType: "DecisionTree",
        version: "1.0",
        features: this.features,
        featureRanges: this.featureRanges,
        labelEncoder: this.featureEncodings,
        hyperparameters: {
          maxDepth: this.maxDepth,
          minSamples: this.minSamples
        },
        metrics: this.metrics,
        metadata: {
          samples: this.samples,
          createdAt: new Date().toISOString()
        },
        model: this.model.toJSON(),
        samplePrediction: {
          input: {
            temperature: 20,
            humidity: 50,
            month: 6,
            condition: "sunny"
          },
          output: this.predict({
            temperature: 20,
            humidity: 50,
            month: 6,
            condition: "sunny"
          })
        }
      };
    }
  
    static fromJSON(json) {
      const tree = new DecisionTree();
      tree.features = json.features;
      tree.featureRanges = json.featureRanges;
      tree.featureEncodings = json.labelEncoder;
      tree.maxDepth = json.hyperparameters.maxDepth;
      tree.minSamples = json.hyperparameters.minSamples;
      tree.metrics = json.metrics;
      tree.samples = json.metadata.samples;
      tree.model = DecisionTreeRegressor.fromJSON(json.model);
      return tree;
    }
  
    predict(data) {
      if (!this.model) {
        throw new Error('Model not trained yet');
      }
  
      // Encode the input data
      const encodedData = this.encodeCategoricalFeatures([data])[0];
      
      // Convert to feature array in correct order
      const features = this.features.map(feature => encodedData[feature]);
      
      // Make prediction
      const prediction = this.model.predict(features);
      
      // Decode prediction back to original label
      return Object.keys(this.featureEncodings.condition)
        .find(key => this.featureEncodings.condition[key] === prediction);
    }
  }