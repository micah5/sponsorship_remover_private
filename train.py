#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""Author: Micah Price (98mprice@gmail.com)
"""

from argparse import ArgumentParser

import src.const
from src.helper import read_data
from src.rnn import create_model, create_tokenizer, preprocess_features, train, predict

def main(argv):
    parser = ArgumentParser()
    parser.add_argument('filename', help='file to train on', default='')
    parser.add_argument('-m', '--model', dest='model_path', help='path to save model to')

    args = parser.parse_args()

    x_text, y_text = read_data('data.csv', x_colname='text', y_colname='sentiment')

    tokenizer = create_tokenizer(x_text)
    feature_length = get_feature_length(x_tokens)
    x_pad = preprocess_features(x_text, tokenizer=tokenizer, feature_length=feature_length)

    model = create_model(feature_length)
    model.summary()

    train(model, x_pad, y_text, filename=args.model_path, validation_split=0.05)

if __name__ == '__main__':
   main(sys.argv[1:])
