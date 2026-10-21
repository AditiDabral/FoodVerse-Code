# FoodVerse AI 🥑 — Multimodal Food Intelligence Platform

**Developed by:** Aditi dabral 
##  Project Overview
FoodVerse AI is a comprehensive multimodal health and nutrition agent. By bridging advanced Computer Vision with Large Language Model (LLM) reasoning via Groq, the platform allows users to seamlessly track exact macros from meal photos, detect produce spoilage, monitor commercial kitchen hygiene, and instantly generate dynamic, personalized recipes.

## Key Features
*   **Plate Analysis & Nutrition Breakdown:** Upload a picture of any meal. The vision engine dissects the image to estimate portion sizes and calculate accurate macronutrient distributions (Protein, Carbs, Fats, Fiber).
*   **Freshness AI & Spoilage Detection:** Assesses the surface texture and discoloration of raw produce to generate a Quality Index and provide safety/discard recommendations.
*   ** Commercial Hygiene Monitor:** Evaluates kitchen workstation snapshots for health code compliance, identifying violations like missing hair restraints or unsafe bare-hand food contact.
*   **AI Chef & Meal Planner:** Multimodal recipe generation via text, voice (Groq Whisper), or pantry photos. Creates weekly meal plans customized to user biometrics and fitness goals.

## Technology Stack
*   **Frontend:** React.js, Tailwind CSS, Vite
*   **Backend:** Python, FastAPI, Uvicorn
*   **AI / Vision:** OpenCV, Custom Vision Processing
*   **LLM Engine:** Groq API (Llama 3 for ultra-fast reasoning)

---

## Installation & Setup

Follow these steps to run the FoodVerse AI platform locally on your machine.

### 1. Clone the Repository
```bash
git clone https://github.com/AditiDabral/FoodVerse-Code.git
cd FoodVerse-Code
```

### 2. Backend Setup (FastAPI)
Open a terminal and navigate to the backend folder:
```bash
cd backend

# Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install required Python packages
pip install -r requirements.txt
```

**Environment Variables:**
Create a `.env` file in the `backend` directory (you can use the provided `.env.example` as a template) and add your Groq API key:
```env
GROQ_API_KEY=your_api_key_here
```

**Run the Backend Server:**
```bash
uvicorn main:app --reload
```
*The API will be running at `http://localhost:8000`*

### 3. Frontend Setup (React/Vite)
Open a new terminal window and navigate to the frontend folder:
```bash
cd frontend

# Install Node modules
npm install

# Start the development server
npm run dev
```
*The frontend application will be running at `http://localhost:5173`*

---

## 🛡️ License
This project is created for demonstration and educational purposes.