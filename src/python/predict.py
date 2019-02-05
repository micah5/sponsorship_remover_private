#!/usr/bin/env python
# -*- coding: utf-8 -*-

""" Author: Micah Price (98mprice@gmail.com)
    Use to run a prediction on a set of strings.
    Input can be file path and the sequences will be read from there,
    otherwise it'll default to a dummy dataset with 4 tests.

    This file is just here for testing purposes, as it's been ported
    across to tensorflow.js in ../javascript/predict.js and this is
    the actual version being used in the current extension.

    TODO: Need to intergrate this with the old codebase so that we
    can input a video id or channel id and scrape a training dataset
    directly from youtube itself.

    TODO: Find a tidy way to handle command line arguments. At the moment
    most of the directory paths are being hardcoded, as I had some issues
    writing cohesive flags between both this and train.py. Another option
    is to store them in ./sponsorship_remover/const.py
"""

import sys

from argparse import ArgumentParser
from youtube_transcript_api import YouTubeTranscriptApi
from keras.models import load_model

from sponsorship_remover.helper import read_data
from sponsorship_remover.rnn import predict, create_tokenizer, preprocess_features, get_feature_length

def main(argv):
    parser = ArgumentParser()
    parser.add_argument('filename', help="path of file to test on", nargs='?')

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

    x_text, y_text = read_data('dataset/data.csv', x_colname='text', y_colname='sentiment')
    print(len(x_text), len(y_text))

    tokenizer = create_tokenizer(x_text)
    x_pad, feature_length = preprocess_features(x_text, tokenizer=tokenizer)
    print(feature_length)

    model = load_model('../output/model.h5')

    pred = predict(model, x_test, tokenizer=tokenizer, feature_length=feature_length)
    print(pred)

if __name__ == "__main__":
   main(sys.argv[1:])
