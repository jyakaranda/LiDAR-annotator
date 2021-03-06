function Box(anchor, cursor, angle, boundingBox, boxHelper) {
    this.id = id; // id (int) of Box
    this.object_id = 'car'; // object id (string)
    this.color = hover_color.clone(); // color of corner points
    this.angle = angle; // orientation of bounding box
    this.anchor = anchor; // point where bounding box was created
    this.cursor = cursor.clone(); // cursor
    this.added = false; // (boolean) whether the box has been added to boundingboxes
    this.boundingBox = boundingBox; // Box3; sets the size of the box
    this.boxHelper = boxHelper; // BoxHelper; helps visualize the box
    this.geometry = new THREE.Geometry(); // geometry for corner/rotating points

    // visualizes the corners (in the non-rotated coordinates) of the box
    this.points = new THREE.Points( this.geometry, pointMaterial );
    this.points.frustumCulled = false; // allows 

    
    this.colors = []; // colors of the corner points

    // add colors to points geometry
    for (var i = 0; i < 6; i++) {
        this.colors.push( this.color.clone().multiplyScalar( 7 ) );
    }
    this.geometry.colors = this.colors;
    
    // order of corners is max, min, topleft, bottomright
    this.geometry.vertices.push(anchor);
    this.geometry.vertices.push(cursor);
    this.geometry.vertices.push(anchor.clone());
    this.geometry.vertices.push(cursor.clone());
    this.geometry.vertices.push(getCenter(anchor.clone(), cursor.clone()));

    this.hasPredictedLabel = false;

    this.get_center = function() {
        var center3D = getCenter(this.geometry.vertices[0], this.geometry.vertices[1]);
        return new THREE.Vector2(center3D.z, center3D.x);
    }
   
    // method for resizing bounding box given cursor coordinates
    // 
    // since BoxHelper3 draws a box in the same orientation as that of the point cloud, 
    // we take the anchor and cursor, rotate them by the angle of the camera, draw the box, 
    // then rotate the box back
    this.resize = function(cursor) {
        // checks and executes only if anchor does not overlap with cursor to avoid 0 determinant
        if (cursor.x != this.anchor.x && cursor.y != this.anchor.y && cursor.z != this.anchor.z) {

            var v1 = cursor.clone();
            var v2 = this.anchor.clone();

            v1.y = 0;
            v2.y = 0;
            
            // rotate cursor and anchor
            rotate(v1, v2, this.angle);

            // calculating corner points and rotating point
            var minVector = getMin(v1, v2);
            var maxVector = getMax(v1, v2);
            var topLeft = getTopLeft(v1, v2);
            var bottomRight = getBottomRight(v1, v2);
            var topCenter = getCenter(topLeft, maxVector);
            var bottomCenter = getCenter(minVector, bottomRight);

            // need to do this to make matrix invertible
            maxVector.y = 0.00001; 

            // setting bounding box limits
            this.boundingBox.set(minVector.clone(), maxVector.clone());

            // rotate BoxHelper back
            this.boxHelper.rotation.y = this.angle;

            // setting y coordinate back to zero since we are done with drawing
            maxVector.y = 0;

            // rotate back the corner points
            rotate(minVector, maxVector, -this.angle);
            rotate(topLeft, bottomRight, -this.angle);
            rotate(topCenter, bottomCenter, -this.angle);

            // set updated corner points used to resize box
            this.geometry.vertices[0] = maxVector.clone();
            this.geometry.vertices[1] = minVector.clone();
            this.geometry.vertices[2] = topLeft.clone();
            this.geometry.vertices[3] = bottomRight.clone();
            this.geometry.vertices[4] = bottomCenter.clone();

            // tell scene to update corner points
            this.geometry.verticesNeedUpdate = true;
        }
    }

    // method to rotate bounding box by clicking and dragging rotate point, 
    // which is the top center point on the bounding box
    this.rotate = function(cursor) {
        // get corner points
        var maxVector = this.geometry.vertices[0].clone();
        var minVector = this.geometry.vertices[1].clone();
        var topLeft = this.geometry.vertices[2].clone();
        var bottomRight = this.geometry.vertices[3].clone();
        var topCenter = getCenter(maxVector, topLeft);
        var bottomCenter = this.geometry.vertices[4].clone();

        // get relative angle of cursor with respect to 
        var center = getCenter(maxVector, minVector);
        var angle = getAngle(center, bottomCenter, cursor, topCenter);

        // update angle of Box and bounding box
        this.angle = this.angle + angle;
        this.boxHelper.rotation.y = this.angle;

        // rotate and update corner points
        rotate(minVector, maxVector, -angle);
        rotate(topLeft, bottomRight, -angle);
        rotate(topCenter, bottomCenter, -angle);

        this.geometry.vertices[0] = maxVector.clone();
        this.geometry.vertices[1] = minVector.clone();
        this.geometry.vertices[2] = topLeft.clone();
        this.geometry.vertices[3] = bottomRight.clone();
        this.geometry.vertices[4] = bottomCenter.clone();

        // tell scene to update corner points
        this.geometry.verticesNeedUpdate = true;
        
    }

    // method to translate bounding box given a reference point
    this.translate = function(v) {
        // get difference in x and z coordinates between cursor when 
        // box was selected and current cursor position
        var dx = v.x - this.cursor.x;
        var dz = v.z - this.cursor.z;

        // update all points related to box by dx and dz
        this.anchor.x += dx;
        this.anchor.z += dz;
        this.cursor = v.clone();
        for (var i = 0; i < this.geometry.vertices.length; i++) {
            var p = this.geometry.vertices[i];
            p.x += dx;
            p.z += dz;
        }

        // shift bounding box given new corner points
        var maxVector = this.geometry.vertices[0].clone();
        var minVector = this.geometry.vertices[1].clone();
        var topLeft = this.geometry.vertices[2].clone();
        var bottomRight = this.geometry.vertices[3].clone();
        var topCenter = getCenter(maxVector, topLeft);
        var bottomCenter = this.geometry.vertices[4].clone();

        rotate(maxVector, minVector, this.angle);
        rotate(topLeft, bottomRight, this.angle);
        rotate(topCenter, bottomCenter, this.angle);

        // need to do this to make matrix invertible
        maxVector.y += 0.0000001; 

        this.boundingBox.set(minVector, maxVector);

        // tell scene to update corner points
        this.geometry.verticesNeedUpdate = true;
    }

    // method to highlight box given cursor
    this.select = function(cursor) {
        selectedBox = this;
        if (this && cursor) {
            selectedBox.cursor = cursor;
        }
        updateHoverBoxes(cursor);
        // this.changeBoundingBoxColor(new THREE.Color( 0,0,7 ) );
        this.changeBoundingBoxColor(selected_color);
    }


    // changes and updates a box's point's color given point index and color
    this.changePointColor = function(idx, color) {
        this.colors[idx] = color;
        this.geometry.colorsNeedUpdate = true;
    }
    // method to change color of bounding box
    this.changeBoundingBoxColor = function(color) {
        var boxHelperCopy = new THREE.Box3Helper( this.boundingBox, color );
        scene.add(boxHelperCopy);
        scene.remove(this.boxHelper);
        this.boxHelper = boxHelperCopy;
        boxHelperCopy.rotation.y = this.angle;
    }

    this.output = function() {
        return new OutputBox(this);
    }

    this.get_cursor_distance_threshold = function() {
        return Math.min(distance2D(this.geometry.vertices[0], this.geometry.vertices[2]),
            distance2D(this.geometry.vertices[0], this.geometry.vertices[1])) / 4;
    }
}
    







// gets angle between v1 and v2 with respect to origin
//
// v3 is an optional reference point that should be v1's reflection about the origin, 
// but is needed to get the correct sign of the angle
function getAngle(origin, v1, v2, v3) {
    v1 = v1.clone();
    v2 = v2.clone();
    origin = origin.clone();
    v1.sub(origin);
    v2.sub(origin);
    v1.y = 0;
    v2.y = 0;
    v1.normalize();
    v2.normalize();

    var angle = Math.acos(Math.min(1.0, v1.dot(v2)));
    if (v3) {
        v3 = v3.clone();
        v3.sub(origin);

        // calculates distance between v1 and v2 when v1 is rotated by angle
        var temp1 = v1.clone();
        rotate(temp1, v3.clone(), angle);
        var d1 = distance2D(temp1, v2);

        // calculates distance between v1 and v2 when v1 is rotated by -angle
        var temp2 = v1.clone();
        rotate(temp2, v3.clone(), -angle);
        var d2 = distance2D(temp2, v2);
        


        // compares distances to determine sign of angle
        if (d2 > d1) {
            angle = -angle;
        }
    }

    return angle;
}


// highlights closest corner point that intersects with cursor
function highlightCorners() {
    // get closest intersection with cursor
    var intersection = intersectWithCorner();

    if (intersection) {
            // get closest point and its respective box
            var box = intersection[0];
            var p = intersection[1];

            // get index of closest point
            var closestIdx = closestPoint(p, box.geometry.vertices);

            // if there was a previously hovered box, change its color back to red
            if (hoverBox) {
                // hoverBox.changePointColor(hoverIdx, new THREE.Color(7, 0, 0));
                hoverBox.changePointColor(hoverIdx, hover_color.clone());
            }

            // update hover box
            hoverBox = box;
            hoverIdx = closestIdx;
            // hoverBox.changePointColor(hoverIdx, new THREE.Color(0, 0, 7));
            hoverBox.changePointColor(hoverIdx, selected_color.clone());

    } else {

        // change color of previously hovered box back to red
        if (hoverBox) {
            // hoverBox.changePointColor(hoverIdx, new THREE.Color(7, 0, 0));
            hoverBox.changePointColor(hoverIdx, hover_color.clone());
        }

        // set hover box to null since there is no intersection
        hoverBox = null;
    }
}




// method to add box to boundingBoxes and object id table
function addBox(box) {
    boundingBoxes.push(box);
    id++;
    addRow(box);
}

function stringifyBoundingBoxes(boundingBoxes) {
    var outputBoxes = [];
    for (var i = 0; i < boundingBoxes.length; i++) {
        outputBoxes.push(new OutputBox(boundingBoxes[i]));
    }
    console.log(outputBoxes);
    return outputBoxes;
}



function OutputBox(box) {
    var v1 = box.geometry.vertices[0];
    var v2 = box.geometry.vertices[1];
    var v3 = box.geometry.vertices[2];
    var center = getCenter(v1, v2);
    this.center = new THREE.Vector2(center.z, center.x);
    console.log("center: ", this.center);
    this.width = distance2D(v2, v3);
    this.length = distance2D(v1, v3);
    this.angle = box.angle;
    this.object_id = box.object_id;
}