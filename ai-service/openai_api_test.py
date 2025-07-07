import openai

# Set the API key
openai.api_key = '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'

# Test the API
response = openai.ChatCompletion.create(
    model="gpt-3.5-turbo",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain automotive parts identification technologies in detail"}
    ]
)

# Print the response
print(response.choices[0].message['content']) 