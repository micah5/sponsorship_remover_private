#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""Author: Micah Price (98mprice@gmail.com)
"""

def read_data(filename, x_colname, y_colname):
    """
    Reads data from filename and extracts features from x_colname and
    target classes from y_colname.

    Args:
        filename: String of dataset path (in csv format).
        x_colname: Column name of features.
        y_colname: Column name of targets.

    Returns:
        List of feature text, list of target text.
    """
    data = pd.read_csv(filename)
    return data[x_colname].values, data[y_colname].values
