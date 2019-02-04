#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""Author: Micah Price (98mprice@gmail.com)
"""

import sys

from argparse import ArgumentParser
from youtube_transcript_api import YouTubeTranscriptApi
from keras.models import load_model

from src.helper import read_data
from src.rnn import predict, create_tokenizer, preprocess_features, get_feature_length

def main(argv):
    parser = ArgumentParser()
    parser.add_argument('filename', help="file to test on", nargs='?')
    parser.add_argument("-m", "--model", dest="model_path", help="model path", default='output/model.h5')
    parser.add_argument("-d", "--dataset", dest="dataset_path", help="dataset path", default='dataset/data.csv')

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

    x_text, y_text = read_data(args.dataset_path, x_colname='text', y_colname='sentiment')
    print(len(x_text), len(y_text))

    tokenizer = create_tokenizer(x_text)
    x_pad, feature_length = preprocess_features(x_text, tokenizer=tokenizer)
    print(feature_length)

    model = load_model(args.model_path)

    pred = predict(model, x_test, tokenizer=tokenizer, feature_length=feature_length)
    print(pred)

if __name__ == "__main__":
   main(sys.argv[1:])
