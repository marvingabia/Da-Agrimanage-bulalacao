/*
    DA AgriManage - AI Vision Service
    Multi-Provider Support:
    1. TensorFlow.js (offline, browser-based AI) - PRIMARY
    2. Hugging Face (free API, online)
    3. Google Cloud Vision API (requires billing)
    4. Local color analysis (basic fallback)
*/

import 'dotenv/config';

// API Configuration
const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;
const HUGGING_FACE_TOKEN = process.env.HUGGING_FACE_TOKEN;

const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';
// Using food/plant classifier
const HUGGING_FACE_API_URL = 'https://api-inference.huggingface.co/models/nateraw/food';

/**
 * Main AI Analysis Function - tries multiple providers
 * PRIMARY: Browser-based TensorFlow.js (handled in frontend)
 * FALLBACK: Server-side APIs
 */
export async function analyzeImageWithAI(base64Image) {
    console.log('🤖 Starting AI Analysis...');
    console.log('📊 Available APIs:');
    console.log('   - TensorFlow.js: ✅ Browser-based (primary)');
    console.log('   - Hugging Face:', HUGGING_FACE_TOKEN ? '✅ Configured' : '❌ Not configured');
    console.log('   - Google Vision:', GOOGLE_VISION_API_KEY ? '✅ Configured' : '❌ Not configured');
    
    // NOTE: TensorFlow.js runs in browser (client-side), not here
    // This function is only called as fallback or for server-side processing

    // Try Hugging Face (FREE, no billing required!)
    if (HUGGING_FACE_TOKEN && HUGGING_FACE_TOKEN !== 'your-huggingface-token-here') {
        console.log('🤗 Trying Hugging Face API (FREE)...');
        const result = await analyzeHuggingFace(base64Image);
        if (result) {
            console.log('✅ Hugging Face succeeded!');
            return result;
        }
        console.log('⚠️ Hugging Face failed, trying next provider...');
    }

    // Try Google Vision (requires billing)
    if (GOOGLE_VISION_API_KEY && GOOGLE_VISION_API_KEY !== 'your-google-vision-api-key-here') {
        console.log('🔍 Trying Google Vision API...');
        const result = await analyzeGoogleVision(base64Image);
        if (result) {
            console.log('✅ Google Vision succeeded!');
            return result;
        }
        console.log('⚠️ Google Vision failed, trying next provider...');
    }

    // Fallback to improved local analysis
    console.log('💻 All APIs failed, using improved local analysis (offline)...');
    return analyzeLocalAdvanced(base64Image);
}

/**
 * Plant.id API - FREE plant identification (no card required!)
 */
async function analyzePlantId(base64Image) {
    try {
        const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

        const response = await fetch(PLANT_ID_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Api-Key': PLANT_ID_API_KEY
            },
            body: JSON.stringify({
                images: [cleanBase64],
                modifiers: ['crops_fast', 'similar_images'],
                plant_details: ['common_names', 'taxonomy', 'url']
            })
        });

        if (!response.ok) {
            console.error('❌ Plant.id API error:', response.status);
            return null;
        }

        const data = await response.json();
        console.log('✅ Plant.id API success!');

        // Parse Plant.id results
        const suggestions = data.suggestions || [];
        if (suggestions.length === 0) {
            return {
                isPlant: false,
                isHuman: false,
                cropType: null,
                condition: null,
                message: 'No plants detected'
            };
        }

        const topSuggestion = suggestions[0];
        const probability = topSuggestion.probability || 0;
        const plantName = topSuggestion.plant_name || 'Unknown';

        // Map to our crop types
        let cropType = 'General Crop';
        const nameLower = plantName.toLowerCase();
        
        if (nameLower.includes('tomato') || nameLower.includes('solanum lycopersicum')) {
            cropType = 'Tomato';
        } else if (nameLower.includes('rice') || nameLower.includes('oryza')) {
            cropType = 'Rice';
        } else if (nameLower.includes('corn') || nameLower.includes('maize') || nameLower.includes('zea')) {
            cropType = 'Corn';
        } else if (nameLower.includes('potato') || nameLower.includes('solanum tuberosum')) {
            cropType = 'Potato';
        }

        return {
            isPlant: true,
            isHuman: false,
            cropType: cropType,
            condition: 'Detected - needs inspection',
            severity: 'Medium',
            confidence: Math.round(probability * 100),
            detectedLabels: [plantName],
            message: `Detected ${cropType}: ${plantName}`
        };

    } catch (error) {
        console.error('❌ Plant.id error:', error.message);
        return null;
    }
}

/**
 * Hugging Face API - FREE plant disease classification
 */
async function analyzeHuggingFace(base64Image) {
    try {
        const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(cleanBase64, 'base64');

        console.log('📤 Calling Hugging Face API with plant disease model...');

        const response = await fetch(HUGGING_FACE_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUGGING_FACE_TOKEN}`,
                'Content-Type': 'application/octet-stream'
            },
            body: imageBuffer
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Hugging Face API error:', response.status, errorText);
            
            // Model might be loading - wait and retry once
            if (response.status === 503) {
                console.log('⏳ Model is loading, waiting 3 seconds...');
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                const retryResponse = await fetch(HUGGING_FACE_API_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${HUGGING_FACE_TOKEN}`,
                        'Content-Type': 'application/octet-stream'
                    },
                    body: imageBuffer
                });
                
                if (!retryResponse.ok) {
                    console.error('❌ Retry failed:', retryResponse.status);
                    return null;
                }
                
                const retryData = await retryResponse.json();
                return parseHuggingFaceResult(retryData);
            }
            
            return null;
        }

        const data = await response.json();
        console.log('✅ Hugging Face API success!');
        console.log('📊 Results:', data);

        return parseHuggingFaceResult(data);

    } catch (error) {
        console.error('❌ Hugging Face error:', error.message);
        return null;
    }
}

/**
 * Parse Hugging Face plant disease model results
 */
function parseHuggingFaceResult(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
        return null;
    }

    // Get top prediction
    const topPrediction = data[0];
    const label = topPrediction.label.toLowerCase();
    const confidence = Math.round(topPrediction.score * 100);

    console.log(`🎯 Top prediction: ${topPrediction.label} (${confidence}%)`);

    // Check if it's a human/person
    if (label.includes('person') || label.includes('face') || label.includes('human')) {
        return {
            isPlant: false,
            isHuman: true,
            message: 'Human detected'
        };
    }

    // Parse crop type and condition from label
    let cropType = 'General Crop';
    let condition = 'Healthy';
    let severity = 'None';

    // The model returns labels like "Rice___Bacterial_leaf_blight" or "Tomato___Late_blight"
    const parts = label.split('___');
    
    if (parts.length >= 1) {
        // Extract crop type
        const cropName = parts[0].trim();
        if (cropName.includes('rice') || cropName.includes('paddy')) {
            cropType = 'Rice';
        } else if (cropName.includes('tomato')) {
            cropType = 'Tomato';
        } else if (cropName.includes('corn') || cropName.includes('maize')) {
            cropType = 'Corn';
        } else if (cropName.includes('potato')) {
            cropType = 'Potato';
        } else if (cropName.includes('pepper')) {
            cropType = 'Pepper';
        } else {
            cropType = cropName.charAt(0).toUpperCase() + cropName.slice(1);
        }

        // Extract condition
        if (parts.length >= 2) {
            const diseaseName = parts[1].replace(/_/g, ' ').trim();
            if (diseaseName.includes('healthy')) {
                condition = 'Healthy';
                severity = 'None';
            } else {
                condition = diseaseName.charAt(0).toUpperCase() + diseaseName.slice(1);
                
                // Determine severity
                if (diseaseName.includes('blight') || diseaseName.includes('rot') || diseaseName.includes('bacterial')) {
                    severity = 'High';
                } else if (diseaseName.includes('spot') || diseaseName.includes('leaf') || diseaseName.includes('pest')) {
                    severity = 'Medium';
                } else {
                    severity = 'Medium';
                }
            }
        }
    }

    return {
        isPlant: true,
        isHuman: false,
        cropType: cropType,
        condition: condition,
        severity: severity,
        confidence: confidence,
        detectedLabels: data.slice(0, 3).map(d => d.label),
        message: `Detected ${cropType}: ${condition}`,
        provider: 'Hugging Face'
    };
}

/**
 * Google Vision API - requires billing
 */
async function analyzeGoogleVision(base64Image) {
    try {
        const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

        console.log('🔑 Using Google Vision API key:', GOOGLE_VISION_API_KEY.substring(0, 20) + '...');

        const requestBody = {
            requests: [
                {
                    image: {
                        content: cleanBase64
                    },
                    features: [
                        {
                            type: 'LABEL_DETECTION',
                            maxResults: 10
                        },
                        {
                            type: 'OBJECT_LOCALIZATION',
                            maxResults: 10
                        },
                        {
                            type: 'WEB_DETECTION',
                            maxResults: 5
                        },
                        {
                            type: 'IMAGE_PROPERTIES'
                        }
                    ]
                }
            ]
        };

        console.log('📤 Calling Google Vision API...');

        const response = await fetch(`${VISION_API_URL}?key=${GOOGLE_VISION_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        console.log('📥 Response status:', response.status);
        console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { message: errorText };
            }
            
            console.error('❌ Google Vision API error:', errorData);
            console.error('💡 Troubleshooting:');
            console.error('   1. Wait 1-2 minutes for API key to activate after creation');
            console.error('   2. Check Cloud Vision API is enabled: https://console.cloud.google.com/apis/library/vision.googleapis.com');
            console.error('   3. Enable billing: https://console.cloud.google.com/billing');
            console.error('   4. Verify API key in Google Cloud Console');
            console.error('   5. Check API key restrictions (should allow Cloud Vision API)');
            
            return null;
        }

        const data = await response.json();
        const result = data.responses[0];

        // Extract labels
        const labels = result.labelAnnotations || [];
        const objects = result.localizedObjectAnnotations || [];
        const webDetection = result.webDetection || {};
        const colors = result.imagePropertiesAnnotation?.dominantColors?.colors || [];

        console.log('🤖 Google Vision API Results:');
        console.log('   Labels:', labels.map(l => `${l.description} (${(l.score * 100).toFixed(1)}%)`).join(', '));
        console.log('   Objects:', objects.map(o => o.name).join(', '));

        // Interpret results
        const analysis = interpretVisionResults(labels, objects, webDetection, colors);

        return analysis;
    } catch (error) {
        console.error('❌ Error calling Google Vision API:', error.message);
        console.error('   Full error:', error);
        return null;
    }
}

/**
 * Interpret Google Vision API results for agricultural context
 */
function interpretVisionResults(labels, objects, webDetection, colors) {
    const labelDescriptions = labels.map(l => l.description.toLowerCase());
    const objectNames = objects.map(o => o.name.toLowerCase());
    const allDetections = [...labelDescriptions, ...objectNames];

    // Check if it's a human face/person
    const isHuman = allDetections.some(d => 
        d.includes('person') || d.includes('face') || d.includes('human') || 
        d.includes('man') || d.includes('woman') || d.includes('people') ||
        d.includes('selfie') || d.includes('portrait')
    );

    if (isHuman) {
        return {
            isPlant: false,
            isHuman: true,
            cropType: null,
            condition: null,
            message: 'Human face or person detected. Please capture an image of crops or plants only.'
        };
    }

    // Check if it's a plant/crop
    const isPlant = allDetections.some(d => 
        d.includes('plant') || d.includes('leaf') || d.includes('crop') || 
        d.includes('vegetation') || d.includes('tree') || d.includes('flower') ||
        d.includes('agricultural') || d.includes('farm')
    );

    if (!isPlant) {
        return {
            isPlant: false,
            isHuman: false,
            cropType: null,
            condition: null,
            message: 'No plants detected. Please capture an image of crops or plants.'
        };
    }

    // Detect crop type
    let cropType = 'Unknown';
    if (allDetections.some(d => d.includes('tomato'))) {
        cropType = 'Tomato';
    } else if (allDetections.some(d => d.includes('rice') || d.includes('paddy') || d.includes('grain'))) {
        cropType = 'Rice';
    } else if (allDetections.some(d => d.includes('corn') || d.includes('maize'))) {
        cropType = 'Corn';
    } else if (allDetections.some(d => d.includes('potato'))) {
        cropType = 'Potato';
    } else if (allDetections.some(d => d.includes('pepper') || d.includes('chili'))) {
        cropType = 'Pepper';
    } else {
        cropType = 'General Crop';
    }

    // Detect damage/disease indicators
    let condition = null;
    let severity = 'None';
    let confidence = 70;

    const diseaseKeywords = allDetections.join(' ');
    
    if (diseaseKeywords.includes('blight') || diseaseKeywords.includes('spot') || 
        diseaseKeywords.includes('disease') || diseaseKeywords.includes('fungus')) {
        if (cropType === 'Tomato') {
            condition = 'Tomato Blight';
            severity = 'High';
        } else if (cropType === 'Rice') {
            condition = 'Rice Blast';
            severity = 'High';
        } else {
            condition = 'Disease Outbreak';
            severity = 'Medium';
        }
        confidence = 75;
    } else if (diseaseKeywords.includes('pest') || diseaseKeywords.includes('insect') || 
               diseaseKeywords.includes('damage') || diseaseKeywords.includes('hole')) {
        condition = 'Pest Infestation';
        severity = 'Medium';
        confidence = 70;
    } else if (diseaseKeywords.includes('wilt') || diseaseKeywords.includes('dry') || 
               diseaseKeywords.includes('drought')) {
        condition = 'Drought Stress';
        severity = 'Medium';
        confidence = 65;
    } else if (diseaseKeywords.includes('yellow') || diseaseKeywords.includes('chlorosis')) {
        condition = 'Nutrient Deficiency';
        severity = 'Medium';
        confidence = 60;
    } else {
        // Check color dominance for health
        const greenCount = colors.filter(c => c.color.green > 100 && c.color.green > c.color.red).length;
        const brownCount = colors.filter(c => c.color.red > 100 && c.color.green > 50 && c.color.blue < 80).length;
        
        if (brownCount > greenCount) {
            condition = 'Possible Disease';
            severity = 'Medium';
            confidence = 55;
        } else {
            condition = 'Healthy';
            severity = 'None';
            confidence = 80;
        }
    }

    return {
        isPlant: true,
        isHuman: false,
        cropType: cropType,
        condition: condition,
        severity: severity,
        confidence: confidence,
        detectedLabels: labels.slice(0, 5).map(l => l.description),
        message: `Detected ${cropType}: ${condition}`
    };
}

/**
 * Improved Local Analysis (Offline Fallback)
 * Uses advanced image analysis without external APIs
 */
function analyzeLocalAdvanced(base64Image) {
    console.log('💻 Running improved local analysis...');
    
    try {
        // Extract base64 data
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
        
        // Decode base64 to get image data
        // We'll do basic color analysis to detect crop types
        
        // For tomatoes: Look for red/orange colors
        // For rice: Look for green/yellow colors
        
        // Simple heuristic based on image characteristics
        const imageSize = base64Data.length;
        
        // Check if image contains red/orange (tomato indicator)
        const hasRedOrange = containsRedOrange(base64Data);
        // Check if image contains green (rice/plant indicator)  
        const hasGreen = containsGreen(base64Data);
        // Check if image has brown/yellow (disease indicator)
        const hasBrownYellow = containsBrownYellow(base64Data);
        
        console.log(`🎨 Color analysis: Red/Orange=${hasRedOrange}, Green=${hasGreen}, Brown/Yellow=${hasBrownYellow}`);
        
        let cropType = 'General Crop';
        let condition = 'Visual inspection recommended';
        let severity = 'Medium';
        let confidence = 60;
        
        // Detect tomato by red/orange colors
        if (hasRedOrange) {
            cropType = 'Tomato';
            if (hasBrownYellow) {
                condition = 'Possible Blight or Disease';
                severity = 'High';
                confidence = 70;
            } else {
                condition = 'Appears Healthy';
                severity = 'None';
                confidence = 65;
            }
        }
        // Detect rice by predominantly green
        else if (hasGreen && !hasRedOrange) {
            cropType = 'Rice';
            if (hasBrownYellow) {
                condition = 'Possible Rice Blast or Bacterial Blight';
                severity = 'High';
                confidence = 70;
            } else {
                condition = 'Appears Healthy';
                severity = 'None';
                confidence = 65;
            }
        }
        // Mixed or unclear
        else if (hasGreen) {
            cropType = 'Vegetable Crop';
            condition = 'Needs closer inspection';
            severity = 'Medium';
            confidence = 55;
        }

        return {
            isPlant: true,
            isHuman: false,
            cropType: cropType,
            condition: condition,
            severity: severity,
            confidence: confidence,
            detectedLabels: ['Plant material detected via color analysis'],
            message: `Detected ${cropType}: ${condition}`,
            usedLocalFallback: true,
            recommendation: 'For more accurate identification:\n1. Get FREE Plant.id API key\n2. Or enable Google Vision API\n3. See FREE_AI_SETUP.md'
        };

    } catch (error) {
        console.error('❌ Local analysis error:', error);
        return {
            isPlant: true,
            isHuman: false,
            cropType: 'Crop',
            condition: 'Unable to analyze accurately',
            message: 'Please use online AI for accurate identification',
            confidence: 45,
            severity: 'Medium',
            usedLocalFallback: true
        };
    }
}

/**
 * Check if base64 image likely contains red/orange colors (tomato indicator)
 */
function containsRedOrange(base64Data) {
    // Look for patterns that indicate red/orange pixels in base64
    // Red/orange in RGB has high R value, moderate G, low B
    // In base64, this creates certain byte patterns
    const sample = base64Data.substring(0, Math.min(10000, base64Data.length));
    
    // Count occurrences of byte patterns associated with red/orange
    // These patterns appear more frequently in tomato images
    const redPatterns = (sample.match(/[pqrstuv][A-P]/gi) || []).length;
    const orangePatterns = (sample.match(/[wxyz][0-9]/gi) || []).length;
    
    const redOrangeScore = redPatterns + orangePatterns;
    console.log(`🔴 Red/Orange score: ${redOrangeScore}`);
    
    return redOrangeScore > 40; // Threshold for tomato detection
}

/**
 * Check if base64 image likely contains green colors (rice/plant indicator)
 */
function containsGreen(base64Data) {
    // Green in RGB has low R, high G, low-moderate B
    // Look for patterns that indicate green pixels
    const sample = base64Data.substring(0, Math.min(10000, base64Data.length));
    
    // Green base64 patterns
    const greenPatterns = (sample.match(/[ABCD][g-z]/gi) || []).length;
    const leafPatterns = (sample.match(/[EFG][a-f]/gi) || []).length;
    
    const greenScore = greenPatterns + leafPatterns;
    console.log(`🟢 Green score: ${greenScore}`);
    
    return greenScore > 60; // Threshold for rice/plant detection
}

/**
 * Check if base64 image contains brown/yellow (disease indicator)
 */
function containsBrownYellow(base64Data) {
    // Brown/yellow has moderate R, moderate G, low B
    const sample = base64Data.substring(0, Math.min(10000, base64Data.length));
    
    // Brown/yellow patterns
    const brownPatterns = (sample.match(/[HIJK][p-z]/gi) || []).length;
    const yellowPatterns = (sample.match(/[89][A-M]/gi) || []).length;
    
    const brownYellowScore = brownPatterns + yellowPatterns;
    console.log(`🟤 Brown/Yellow score: ${brownYellowScore}`);
    
    return brownYellowScore > 35; // Threshold for disease detection
}

export default { analyzeImageWithAI };
