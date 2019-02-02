#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""Author: Micah Price (98mprice@gmail.com)
"""

from argparse import ArgumentParser
from youtube_transcript_api import YouTubeTranscriptApi
from keras.models import load_model

from src.rnn import predict, create_tokenizer, preprocess_features

def main(argv):
    parser = ArgumentParser()
    parser.add_argument('filename', help="file to test on")
    parser.add_argument("-m", "--model", dest="model_path", help="model path", default='output/model.h5')

    args = parser.parse_args()

    if args.filename is not None:
        # read from file
        with open(args.filename) as fp:
            x_test = fp.readlines()
    else:
        # default to some test strings
        x_test = ['dont forget to like share and subscribe', #sponsored
                  'i was thinking about my old model m keyboard', #not sponsored
                  'check it out in the link in the description', #sponsored
                  'this is a review of the brand new television from samsung'] #not sponsored

    model = load_model(args.model_path)
    tokenizer = create_tokenizer(x_text)
    feature_length = get_feature_length(x_tokens)
    pred = predict(model, x_test, tokenizer, feature_length)
    print(pred)

if __name__ == "__main__":
   main(sys.argv[1:])
