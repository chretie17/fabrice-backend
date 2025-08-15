const db = require('../db'); // Import database connection

// ===================== Surveys CRUD =====================

// Admin: Create a new survey
// Admin: Get all surveys (active and inactive)
exports.getAllSurveys = async (req, res) => {
  try {
    const selectQuery = `
      SELECT 
        surveys.id AS survey_id,
        surveys.title,
        surveys.description,
        surveys.start_date,
        surveys.end_date,
        surveys.status,
        surveys.rating,
        questions.id AS question_id,
        questions.question_text,
        questions.question_type,
        questions.options
      FROM surveys
      LEFT JOIN questions ON surveys.id = questions.survey_id;
    `;

    const [surveys] = await db.promise().query(selectQuery);

    const surveyMap = surveys.reduce((acc, survey) => {
      const { survey_id, question_id, question_text, question_type, options, start_date, end_date, rating } = survey;

      // Format the start and end dates
      const formattedStartDate = new Date(start_date).toLocaleString();
      const formattedEndDate = new Date(end_date).toLocaleString();

      if (!acc[survey_id]) {
        acc[survey_id] = {
          id: survey_id,
          title: survey.title,
          description: survey.description,
          start_date: formattedStartDate,
          end_date: formattedEndDate,
          status: survey.status,
          rating: rating,
          questions: [],
        };
      }

      if (question_id) {
        const optionsArray = options && typeof options === 'string' ? options.split(',') : [];
        acc[survey_id].questions.push({
          id: question_id,
          question_text,
          question_type,
          options: optionsArray,
        });
      }

      return acc;
    }, {});

    const result = Object.values(surveyMap);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching surveys:', error);
    res.status(500).json({ message: 'Error fetching surveys', error });
  }
};

// Admin: Create a new survey
exports.createSurvey = async (req, res) => {
  const { title, description, start_date, end_date, rating } = req.body;

  if (!title || !start_date || !end_date) {
    return res.status(400).json({ message: 'Title, start date, and end date are required.' });
  }

  try {
    const insertQuery = `
      INSERT INTO surveys (title, description, start_date, end_date, rating)
      VALUES (?, ?, ?, ?, ?);
    `;
    const result = await db.promise().query(insertQuery, [title, description, start_date, end_date, rating]);
    res.status(201).json({ message: 'Survey created successfully', surveyId: result[0].insertId });
  } catch (error) {
    console.error('Error creating survey:', error);
    res.status(500).json({ message: 'Error creating survey', error });
  }
};

// Admin: Activate or Deactivate a survey
exports.updateSurveyStatus = async (req, res) => {
  const { surveyId, status } = req.body;

  if (!surveyId || !status) {
    return res.status(400).json({ message: 'Survey ID and status are required.' });
  }

  const validStatuses = ['active', 'inactive'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status. Status must be either "active" or "inactive".' });
  }

  try {
    const updateStatusQuery = `
      UPDATE surveys 
      SET status = ? 
      WHERE id = ?;
    `;
    await db.promise().query(updateStatusQuery, [status, surveyId]);

    res.status(200).json({ message: `Survey status updated to ${status} successfully.` });
  } catch (error) {
    console.error('Error updating survey status:', error);
    res.status(500).json({ message: 'Error updating survey status', error });
  }
};

// Admin: Update an existing survey
exports.updateSurvey = async (req, res) => {
  const { surveyId, title, description, start_date, end_date, status, rating } = req.body;

  if (!surveyId || !title || !start_date || !end_date) {
    return res.status(400).json({ message: 'Survey ID, title, start date, and end date are required.' });
  }

  try {
    const updateQuery = `
      UPDATE surveys 
      SET title = ?, description = ?, start_date = ?, end_date = ?, status = ?, rating = ?
      WHERE id = ?;
    `;
    await db.promise().query(updateQuery, [title, description, start_date, end_date, status, rating, surveyId]);
    res.status(200).json({ message: 'Survey updated successfully' });
  } catch (error) {
    console.error('Error updating survey:', error);
    res.status(500).json({ message: 'Error updating survey', error });
  }
};

// Admin: Delete a survey
exports.deleteSurvey = async (req, res) => {
  const { surveyId } = req.params;

  if (!surveyId) {
    return res.status(400).json({ message: 'Survey ID is required.' });
  }

  try {
    const deleteQuestionsQuery = 'DELETE FROM questions WHERE survey_id = ?;';
    await db.promise().query(deleteQuestionsQuery, [surveyId]);

    const deleteSurveyQuery = 'DELETE FROM surveys WHERE id = ?;';
    await db.promise().query(deleteSurveyQuery, [surveyId]);

    res.status(200).json({ message: 'Survey and associated questions deleted successfully' });
  } catch (error) {
    console.error('Error deleting survey:', error);
    res.status(500).json({ message: 'Error deleting survey', error });
  }
};

// ===================== Questions CRUD =====================

// Admin: Add a question to a survey
exports.addQuestion = async (req, res) => {
    const { surveyId, question_text, question_type, options } = req.body;
  
    // Basic validation for required fields
    if (!surveyId || !question_text || !question_type) {
      return res.status(400).json({ message: 'Survey ID, question text, and type are required.' });
    }
  
    // Validate question type
    const validTypes = ['text', 'multiple_choice', 'ratings'];
    if (!validTypes.includes(question_type)) {
      return res.status(400).json({ message: 'Invalid question type. Must be "text", "multiple_choice", or "ratings".' });
    }
  
    // Validate options for multiple-choice questions
    if (question_type === 'multiple_choice') {
        if (!options || options.length < 2) {
          return res.status(400).json({ message: 'Multiple choice questions must have at least 2 options.' });
        }
        // Ensure options is an array
        if (!Array.isArray(options)) {
          return res.status(400).json({ message: 'Options must be an array.' });
        }
      }
      
  
    try {
      // Insert question into the database
      const insertQuery = `
        INSERT INTO questions (survey_id, question_text, question_type, options)
        VALUES (?, ?, ?, ?);
      `;
      
      // If options exist, stringify them for storage in the database
      const optionsJson = question_type === 'multiple_choice' ? JSON.stringify(options) : null;
  
      // Execute the query
      const result = await db.promise().query(insertQuery, [surveyId, question_text, question_type, optionsJson]);
  
      res.status(201).json({
        message: 'Question added successfully',
        questionId: result[0].insertId,
      });
    } catch (error) {
      console.error('Error adding question:', error);
      res.status(500).json({ message: 'Error adding question', error });
    }
  };
  
  // Admin: Update a question
exports.updateQuestion = async (req, res) => {
  const { questionId, question_text, question_type, options } = req.body;

  if (!questionId || !question_text || !question_type) {
    return res.status(400).json({ message: 'Question ID, text, and type are required.' });
  }

  const validTypes = ['text', 'multiple_choice', 'ratings'];
  if (!validTypes.includes(question_type)) {
    return res.status(400).json({ message: 'Invalid question type.' });
  }

  try {
    const updateQuery = `
      UPDATE questions 
      SET question_text = ?, question_type = ?, options = ?
      WHERE id = ?;
    `;
    await db.promise().query(updateQuery, [question_text, question_type, JSON.stringify(options), questionId]);
    res.status(200).json({ message: 'Question updated successfully' });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ message: 'Error updating question', error });
  }
};

// Admin: Delete a question
exports.deleteQuestion = async (req, res) => {
  const { questionId } = req.params;

  if (!questionId) {
    return res.status(400).json({ message: 'Question ID is required.' });
  }

  try {
    const deleteQuery = 'DELETE FROM questions WHERE id = ?;';
    await db.promise().query(deleteQuery, [questionId]);
    res.status(200).json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ message: 'Error deleting question', error });
  }
};

// ===================== Tenant CRUD =====================

// Tenant: Get surveys to participate in (with questions)
// Backend: Fetch available surveys with associated questions
exports.getAvailableSurveys = async (req, res) => {
    try {
      const selectSurveysQuery = `
        SELECT * FROM surveys WHERE status = "active";
      `;
      const [surveys] = await db.promise().query(selectSurveysQuery);
  
      const surveysWithQuestions = await Promise.all(surveys.map(async (survey) => {
        const selectQuestionsQuery = `
          SELECT * FROM questions WHERE survey_id = ?;
        `;
        const [questions] = await db.promise().query(selectQuestionsQuery, [survey.id]);
  
        return {
          ...survey,
          questions,
        };
      }));
  
      res.status(200).json(surveysWithQuestions);
    } catch (error) {
      console.error('Error fetching surveys:', error);
      res.status(500).json({ message: 'Error fetching surveys', error });
    }
  };
  
  // Backend: Submit responses
  exports.submitSurveyResponses = async (req, res) => {
    const { surveyId, responses, userId } = req.body;

if (!surveyId || !responses || !Array.isArray(responses) || !userId) {
  return res.status(400).json({ message: 'Survey ID, responses, and user ID are required.' });
}

try {
  const insertResponsesQuery = `
    INSERT INTO responses (survey_id, user_id, responses) VALUES (?, ?, ?);
  `;
  await db.promise().query(insertResponsesQuery, [surveyId, userId, JSON.stringify(responses)]);

  res.status(200).json({ message: 'Responses submitted successfully' });
} catch (error) {
  console.error('Error submitting responses:', error);
  res.status(500).json({ message: 'Error submitting responses', error });
}
 
  };
 // Controller to fetch all surveys and their responses
 exports.getAllSurveysAndResponses = async (req, res) => {
    try {
      // Fetch all surveys
      const [surveys] = await db.promise().query('SELECT id, title,created_at, description FROM surveys');
  
      if (surveys.length === 0) {
        return res.status(404).json({ message: 'No surveys found' });
      }
  
      // Initialize an array to hold survey details along with responses
      const surveysWithResponses = [];
  
      for (const survey of surveys) {
        // For each survey, fetch the responses along with user_name
        const [responses] = await db.promise().query(
          'SELECT r.user_id, r.responses, u.name as user_name FROM responses r JOIN users u ON r.user_id = u.id WHERE r.survey_id = ?',
          [survey.id]
        );
  
        // Fetch questions for the current survey
        const [questions] = await db.promise().query(
          'SELECT id, question_text, question_type FROM questions WHERE survey_id = ?',
          [survey.id]
        );
  
        // Process the responses to include question text and response
        const processedResponses = responses.map((response) => {
          console.log('Raw response data:', response.responses);  // Debug log
  
          let parsedResponses;
  
          try {
            // Check if responses are a string and parse it if necessary
            if (typeof response.responses === 'string') {
              parsedResponses = JSON.parse(response.responses);  // If it's a string, parse it
            } else {
              parsedResponses = response.responses;  // If it's already an object, just use it
            }
          } catch (err) {
            console.error('Error parsing response data:', err);
            parsedResponses = [];
          }
  
          // Map parsed responses to include question text and type
          const detailedResponses = parsedResponses.map((answer) => {
            const question = questions.find(q => q.id.toString() === answer.questionId);
            return {
              question_text: question ? question.question_text : 'Unknown Question',
              question_type: question ? question.question_type : 'Unknown Type',
              response: answer.response,
            };
          });
  
          return {
            user_name: response.user_name, // Use user_name here
            responses: detailedResponses,
          };
        });
  
        // Add the survey and its responses to the result
        surveysWithResponses.push({
          survey: survey,
          responses: processedResponses,
        });
      }
  
      // Send back all surveys and their responses
      res.status(200).json({ surveys: surveysWithResponses });
    } catch (error) {
      console.error('Error fetching surveys and responses:', error);
      res.status(500).json({ message: 'Error fetching surveys and responses', error });
    }
  };
  
    
// Admin: Get questions for a specific survey
exports.getSurveyQuestions = async (req, res) => {
    const surveyId = req.params.surveyId;
    try {
      // Fetch questions from the database based on surveyId using the promise-based query
      const [questions] = await db.promise().query('SELECT * FROM questions WHERE survey_id = ?', [surveyId]);
      
      // Return the questions in the response
      res.status(200).json(questions);
    } catch (error) {
      console.error('Error fetching survey questions:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
  // Admin: Get all questions with their associated surveys
  exports.getAllQuestionsWithSurveys = async (req, res) => {
    try {
      // Query to fetch all questions along with their survey details
      const selectQuery = `
        SELECT 
          surveys.id AS survey_id,
          surveys.title AS survey_title,
          surveys.description AS survey_description,
          questions.id AS question_id,
          questions.question_text,
          questions.question_type,
          questions.options
        FROM surveys
        LEFT JOIN questions ON surveys.id = questions.survey_id;
      `;
  
      const [questions] = await db.promise().query(selectQuery);
  
      if (questions.length === 0) {
        return res.status(404).json({ message: 'No questions found' });
      }
  
      // Format response data
      const result = questions.map(question => ({
        survey_id: question.survey_id,
        survey_title: question.survey_title,
        survey_description: question.survey_description,
        question_id: question.question_id,
        question_text: question.question_text,
        question_type: question.question_type,
        options: (typeof question.options === 'string') ? question.options.split(',') : [],
      }));
  
      res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching all questions with surveys:', error);
      res.status(500).json({ message: 'Error fetching questions', error });
    }
  };
  