const Joi = require("joi");

const chatSchema = Joi.object({
  message: Joi.string().trim().min(1).max(8000).required().messages({
    "string.empty": "Message cannot be empty",
    "string.max": "Message is too long (max 8000 characters)",
    "any.required": "Message is required",
  }),
});

module.exports = { chatSchema };