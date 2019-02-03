#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""Author: Micah Price (98mprice@gmail.com)
"""

import sys

from argparse import ArgumentParser

import src.const
from src.helper import read_data
from src.rnn import create_model, create_tokenizer, preprocess_features, train, predict

def main(argv):
    parser = ArgumentParser()
    parser.add_argument('dataset_path', help='file to train on', nargs='?', default='./dataset/data.csv')
    parser.add_argument('-m', '--model', dest='model_path', help='path to save model to', default='./output/model.h5')

    args = parser.parse_args()

    x_text, y_text = read_data(args.dataset_path, x_colname='text', y_colname='sentiment')

    tokenizer = create_tokenizer(x_text)
    x_pad, feature_length = preprocess_features(x_text, tokenizer=tokenizer)

    model = create_model(feature_length)
    model.summary()

    train(model, x_pad, y_text, filename=args.model_path, validation_split=0.05)

if __name__ == '__main__':
   main(sys.argv[1:])
