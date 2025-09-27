// الملف: vercel-functions/api/speechToText.js

// نستخدم require لأن هذه بيئة Node.js
const fetch = require('node-fetch');

// هذا هو المفتاح الذي وضعناه في ملف .env
const GOOGLE_CLOUD_API_KEY = process.env.GOOGLE_CLOUD_API_KEY;

module.exports = async (req, res) => {
  // نتأكد أن الطلب هو POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // الصوت سيصلنا من التطبيق بصيغة base64
    const { audioBase64 } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio data (base64) is missing.' });
    }

    // إعدادات الطلب لـ Google Cloud Speech-to-Text
    const googleApiUrl = `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_CLOUD_API_KEY}`;

    const requestBody = {
      config: {
        encoding: 'AMR', // expo-av يسجل بصيغة AMR على أندرويد
        sampleRateHertz: 16000,
        languageCode: 'en-US', // أو 'ar-SA' للعربية
      },
      audio: {
        content: audioBase64,
      },
    };

    // إرسال الطلب إلى Google Cloud باستخدام fetch
    const googleResponse = await fetch(googleApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const googleData = await googleResponse.json();

    // إذا كان هناك خطأ من Google
    if (googleData.error) {
      console.error('Google API Error:', googleData.error);
      return res.status(500).json({ error: 'Google API Error', details: googleData.error });
    }

    // استخراج النص المترجم
    const transcription = googleData.results
      ? googleData.results.map(result => result.alternatives[0].transcript).join('\n')
      : 'No transcription found.';
    
    // إعادة النص المترجم إلى التطبيق
    res.status(200).json({ transcription });

  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};