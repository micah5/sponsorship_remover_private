#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""Author: Micah Price (98mprice@gmail.com)
   Based on LSTM Sentiment Analysis notebook by Peter Nagy:
   https://www.kaggle.com/ngyptr/lstm-sentiment-analysis-keras
"""

import numpy as np
import pandas as pd

from keras.preprocessing.text import Tokenizer
from keras.preprocessing.sequence import pad_sequences
from keras.models import Sequential, load_model
from keras.layers import Dense, Embedding, LSTM, SpatialDropout1D

from .const import *

def create_model(max_tokens):
    """
    Creates model structure.

    Args:
        max_tokens: Length of input vector.

    Returns:
        Model.
    """

    model = Sequential()
    model.add(Embedding(input_dim=const.NUM_WORDS,
                        output_dim=const.EMBED_DIM,
                        input_length=max_tokens))
    model.add(SpatialDropout1D(0.4))
    model.add(LSTM(196, dropout=0.2, recurrent_dropout=0.2))
    model.add(Dense(1, activation='sigmoid'))
    model.compile(loss='binary_crossentropy', optimizer='adam', metrics=['accuracy'])
    return model

def create_tokenizer(x_text):
    """
    Creates word embeddings - word to vector.

    Args:
        x_text: List of raw text to create tokenizer from.

    Returns:
        Tokenizer.
    """
    tokenizer = Tokenizer(num_words=NUM_WORDS)
    tokenizer.fit_on_texts(x_text)
    return tokenizer

def get_feature_length(x_tokens):
    """
    Padding/ truncating.
    Ensures that each sequence is of the same length in batch.
    Max tokens set to avg + 2 std dev.

    Args:
        x_tokens: List of sequences.

    Returns:
        Max feature length (max tokens).
    """
    num_tokens = np.array([len(tokens) for tokens in x_tokens])
    avg_tokens = np.mean(num_tokens)
    return int(avg_tokens + 2 * np.std(num_tokens))

def preprocess_features(x_text, tokenizer):
    """
    Converts raw text into tokens, and returns
    embedding vector.

    Args:
        x_text: List of raw text.
        tokenizer: Keras tokenizer used to create embedding.
        feature_length: Length of each sequence (after padding/ truncating)

    Returns:
        Processed features.
    """

    x_tokens = tokenizer.texts_to_sequences(x_text)

    feature_length = get_feature_length(x_tokens)

    # zeros added at beginning because this prevents early fatigue of network
    x_pad = pad_sequences(x_tokens, maxlen=feature_length, padding='pre', truncating='post')

    return x_pad, feature_length

def train(model, x, y, filename='model.h5', validation_split=0.05):
    """
    Trains model

    Args:
        model: Keras model.
        x: Feature (padded).
        y: Targets.
        filename: Path used to save trained model.
                  Not saved if set to None.
                  Defaults to 'model.h5'.
        validation_split: Takes last % of the data as validation set.
                          Defaults to 0.05.

    Returns:
        Trained model.
    """
    model.fit(x, y, epochs=const.EPOCHS, batch_size=const.BATCH_SIZE,
        validation_split=validation_split, shuffle=True)
    if filename != None:
        model.save(filename)
    return model

def predict(model, x_test, tokenizer, feature_length):
    """
    Takes a list of test strings and produces a vector based on their
    respective predictions.
    Closer to 0 indicates a sponsor, closer to 1 indicates non sponsored.

    Args:
        model: Keras model.
        x_test: Raw text to test on (will be preprocessed).
        tokenizer: Keras tokenizer used to create embedding.

    Returns:
        Prediction vector.
    """

    x_test_tokens = tokenizer.texts_to_sequences(x_test)

    x_test_pad = pad_sequences(x_test_tokens, maxlen=feature_length, padding='pre', truncating='post')

    return model.predict(x_test_pad)
