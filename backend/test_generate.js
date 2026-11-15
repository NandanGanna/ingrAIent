const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testGen() {
  console.log('Sending request to gemini-3.8-flash with apiKey:', Boolean(process.env.GEMINI_API_KEY));
  const t0 = Date.now();
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Invent 1 quick recipe using Tomato and Paneer. Return JSON matching: {"recipes": [{"id": "r1", "title": "Dish", "description": "Desc", "cuisine": "Indian", "prepTimeMinutes": 5, "cookTimeMinutes": 10, "difficulty": "Easy", "servings": 2, "tags": [], "ingredients": [{"name": "Paneer", "quantity": 100, "unit": "g", "available": true, "required": true, "optional": false}], "steps": [{"instruction": "Cook paneer", "durationMinutes": 5}], "substitutions": []}]}',
      config: {
        responseMimeType: 'application/json'
      }
    });
    console.log(`Success in ${(Date.now() - t0)/1000}s!`);
    console.log('Result sample:', res.text.slice(0, 150));
  } catch (err) {
    console.log(`Failed in ${(Date.now() - t0)/1000}s with error:`, err.message);
  }
}
testGen();
