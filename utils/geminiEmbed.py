#!/usr/bin/env python
import sys, json

def main():
    text = sys.stdin.read()
    # replace the next two lines with your actual Gemini embedding call
    # e.g. gemini.embed(text) or whatever your library provides
    embedding = your_gemini_embedding_function(text)

    print(json.dumps({ "embedding": embedding }))

if __name__ == "__main__":
    main()
