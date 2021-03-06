#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Mon Jul 30 17:23:50 2018

@author: bc
"""
import os

import numpy as np
from PIL import Image

import matplotlib.pyplot as plt

from calib import Calib
import getCoord as getCoord
import math

current_dir_path = os.path.dirname(os.path.realpath(__file__))
# print(current_dir_path)
image_ab_path = current_dir_path+'/data/image/'
bin_ab_path = current_dir_path+'/data/bin_data/'
# print("image path: ", image_ab_path)
# print("bin path: ", bin_ab_path)

def generate_2d_lidar():
    calib = Calib('/Users/berniewang/annotator/lidarAnnotator/app/classify/calib')
     # load image
    img_name = getCoord.getPictureName()
    # print("image path again: ", os.path.join(image_ab_path+img_name))
    im = Image.open(os.path.join(image_ab_path+img_name))
    w, h = im.size
    #im = np.array(im)

    # load lidar points
    bin_name = getCoord.getFileName()
    # print(bin_name)
    scan = np.fromfile(
        os.path.join(bin_ab_path+bin_name),
        dtype=np.float32).reshape((-1, 4))
    #im_coord0 = calib.velo2img(scan[:, :3], 2).astype(np.int)

    x = getCoord.getX()
    y = getCoord.getY()
    width = getCoord.getWidth()
    length = getCoord.getLength()
    angle = getCoord.getAngle()
    image_path = []
    
    for i in range(len(x)):
        a = x[i]
        b = y[i]
        c = width[i]/2
        d = length[i]/2
        e = angle[i]
        out_of_fov = False
        a_array = np.array([0],dtype = np.float32)
        for j in range(len(scan)):
            if scan[j][0] > a - c and scan[j][0] < a + c and scan[j][1] > b - d and scan[j][1]< b + d:

            #if scan[j][0] > a - c * abs(math.cos(e)) and scan[j][0] < a + c * abs(math.cos(e)) and scan[j][1] > b - d * abs(math.cos(e)) and scan[j][1]< b + d * abs(math.cos(e)):
                a_array = np.append(a_array,scan[j])
                #if scan[j][0] > a - c and scan[j][0] < a + c and scan[j][1] > b - d and scan[j][1]< b + d:
        a_array = np.delete(a_array,0)

        a_array = a_array.reshape((int(len(a_array)/4),4))

        a_array.tofile(os.path.join(current_dir_path, "a.bin"))

        scan2 = np.fromfile(
            os.path.join(current_dir_path, 'a.bin'),
            dtype=np.float32).reshape((-1, 4))
        im_coord = calib.velo2img(scan2[:, :3], 2).astype(np.int)
        # plt.imshow(im)
        im_coord2 = [im_coord[i] for i in range(len(im_coord)) if im_coord[i][0] > 0 and im_coord[i][0] <= w and im_coord[i][1] > 0 and im_coord[i][1] <= h]
        x_arr = []
        y_arr = []
        # print("length of im_coord2: ", len(im_coord2))
        if len(im_coord2) != 0:
            x_max = im_coord2[0][0]
            for i in range(len(im_coord2)):
                if im_coord2[i][0] > x_max:
                    x_max = im_coord2[i][0]
    
            x_min = im_coord2[0][0]
            for i in range(len(im_coord2)):
                if im_coord2[i][0] < x_min:
                    x_min = im_coord2[i][0]
    
            y_max = im_coord2[0][1]
            for i in range(len(im_coord2)):
                if im_coord2[i][1] > y_max:
                    y_max = im_coord2[i][1]
    
            y_min = im_coord2[0][1]
            for i in range(len(im_coord2)):
                if im_coord2[i][1] < y_min:
                    y_min = im_coord2[i][1]
            #print(x_max,y_max,x_min,y_min)
        else:
            x_max = w
            y_max = h
            x_min = 0
            y_min = 0
            print("your frame can not show on the picture")
            out_of_fov = True
            # filename = 'write_data.txt'
            # with open(filename,'a') as f:
            #     f.write("your frame can not show on the picture\n")
        
        box = (x_min, y_min,x_max, y_max)
        image1 = im.crop(box)#图像裁剪
        # image1.show()
        image1.save("/Users/berniewang/annotator/lidarAnnotator/app/classify/inception/%d.jpg"%(i+1))
        if not out_of_fov:
            image_path.append("/Users/berniewang/annotator/lidarAnnotator/app/classify/inception/%d.jpg"%(i+1))
        else:
            image_path.append("")
        for i in range(len(im_coord)):
            x_arr.append(im_coord[i][0])
            y_arr.append(im_coord[i][1])


        # plt.scatter(x_arr,y_arr,s = 1)
        # plt.show()
        # plt.imshow(np.asarray(image1))
        # plt.show()
    return image_path


if __name__ == '__main__':
   generate_2d_lidar()
