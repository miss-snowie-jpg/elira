import axios from "axios";

const PYTHON_AI_URL =
  process.env.PYTHON_AI_URL ||
  "http://127.0.0.1:8000";


export const chatWithAI = async (req, res) => {

  try {

    const { message, chat_id } = req.body;

    if (!message || !message.trim()) {

      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });

    }


    // ---------------------------------------------
    // USER COMES FROM VERIFIED JWT
    // ---------------------------------------------

    const userId = req.user.id;


    // ---------------------------------------------
    // SEND REQUEST TO PYTHON AI
    // ---------------------------------------------

    const response = await axios.post(
      `${PYTHON_AI_URL}/ai/chat`,
      {
        user_id: userId,
        message: message.trim(),
        chat_id: chat_id || null,
      }
    );


    return res.status(200).json({
      success: true,
      chat_id: response.data.chat_id,
      response: response.data.response,
    });


  } catch (error) {

    console.error(
      "AI CONTROLLER ERROR:",
      error.response?.data || error.message
    );


    return res.status(500).json({
      success: false,
      message: "Unable to reach ELIRA AI.",
    });

  }
};