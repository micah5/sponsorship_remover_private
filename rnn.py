#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""Author: Micah Price (98mprice@gmail.com)
   Based on LSTM Sentiment Analysis notebook by Peter Nagy:
   https://www.kaggle.com/ngyptr/lstm-sentiment-analysis-keras
"""

import re
import numpy as np
import pandas as pd

from sklearn.feature_extraction.text import CountVectorizer
from sklearn.model_selection import train_test_split

from keras.preprocessing.text import Tokenizer
from keras.preprocessing.sequence import pad_sequences
from keras.models import Sequential, load_model
from keras.layers import Dense, Embedding, LSTM, SpatialDropout1D, GRU
from keras.utils.np_utils import to_categorical

# consts
NUM_WORDS = 2000 # for entire vocabulary use len(tokenizer.word_index)
EMBED_DIM = 8
BATCH_SIZE = 64
EPOCHS = 3

def read_data(filename, x_colname, y_colname):
    """
        reads data from filename and extracts features from x_colname and target classes from y_colname
    """
    data = pd.read_csv(filename)
    return data[x_colname].values, data[y_colname].values

# TODO: check diff model structures incld with GRU rather than LSTM
def create_model(max_tokens):
    """
        generates model
    """
    model = Sequential()
    model.add(Embedding(input_dim=NUM_WORDS,
                        output_dim=EMBED_DIM,
                        input_length=max_tokens))
    model.add(LSTM(units=16, return_sequences=True))
    model.add(LSTM(units=8))
    model.add(Dense(1, activation='sigmoid'))
    model.compile(loss='binary_crossentropy', optimizer='adam', metrics=['accuracy'])
    return model

# read training data
# TODO: split into set validation & test sets
# (currently set to use Keras to split a portion of the training set into validation set)
x_text, y_text = read_data('data.csv', x_colname='text', y_colname='sentiment')

# tokenizer
# word embeddings - word to vector
tokenizer = Tokenizer(num_words=NUM_WORDS)
tokenizer.fit_on_texts(x_text)
x_tokens = tokenizer.texts_to_sequences(x_text)

# padding/ truncating
# ensures each seq of same length in batch
# max tokens set to avg + 2 std dev
num_tokens = np.array([len(tokens) for tokens in x_tokens])
avg_tokens = np.mean(num_tokens)
max_tokens = int(avg_tokens + 2 * np.std(num_tokens))
#print('tokens cover %d\% of dataset' % (np.sum(num_tokens < max_tokens) / len(num_tokens)))

# TODO: check this
# zeros added at beginning because this prevents early fatigue of network
# words removed from end of seq because ..?
x_pad = pad_sequences(x_tokens, maxlen=max_tokens, padding='pre', truncating='post')

# model
model = create_model(max_tokens=max_tokens)
print(model.summary())

model.fit(x_pad, y_text, epochs=EPOCHS, batch_size=BATCH_SIZE, validation_split=0.05, shuffle=True)
model.save('model.h5')

#model = load_model('model.h5')
# test prediction
x_test = ['dont forget to like share and subscribe', 'i was thinking about my old model m keyboard']
x_test_tokens = tokenizer.texts_to_sequences(x_test)
x_test_pad = pad_sequences(x_test_tokens, maxlen=max_tokens, padding='pre', truncating='post')
print(x_test_pad)
sentiment = model.predict(x_test_pad)
print(sentiment)
