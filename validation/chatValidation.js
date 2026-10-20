const Joi = require("joi");

const chatSchema = Joi.object({
  message: Joi.string().trim().min(1).required().messages({
    "string.empty": "Message cannot be empty",
    "any.required": "Message is required",
  }),
});

module.exports = { chatSchema };
