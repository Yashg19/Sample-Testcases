var fisheye = d3.fisheye.circular().radius(fishEyeRadius).distortion(fishEyeDistortionFactor);

// Adi start

var node, link, original_link;

function createFDR(graph) {
    //delete and recreate the svg element on each new search
    d3.select("svg").remove();
    svg = d3.select("div.background").append("svg").attr("width", "100%").attr(
									       "height", "100%");
    
    //arrow marker for links. Two markers: one for L1 links and other for others
    svg.append("svg:defs").selectAll("marker")
        .data(["arrow", "arrowLevel1"])
        .enter().append("svg:marker")
        .attr("id", String)
        .attr("viewBox", "0 0 10 10")
        .attr("refX", 0)
        .attr("refY", 5)
        .attr("markerWidth", function(d) {
		return d=="arrowLevel1" ? 6 : 3;})
        .attr("markerHeight", function(d) {
		return d=="arrowLevel1" ? 6 : 4;})
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M 0 0 L 10 5 L 0 10 z")
        .style("fill", "#666666");
    
    //read nodes and links and associate with force
    var nodeMap = {};
    graph.nodes.forEach(function(x) {
	    nodeMap[x.id] = x;
	});
    graph.links = graph.links.map(function(x) {
	    return {
		source: nodeMap[x.source],
		target: nodeMap[x.target],
		value: x.value,
		info: x.info
	    };
	});

    force.nodes(graph.nodes).links(graph.links).start();

    //simulate first node click event after 2s
    setTimeout(simulateClick, 2000);

    addNodeElements(graph);
    addLinkElements(graph);
    
    createAdjacencyList();
    
    //findSectorAngles(center);

    //force layout simulation. Defines what happens with each simulation tick
    force.on("tick", function(e) {
	    tickCount++;
	    
	    //place level1 (L1) nodes in circular fashion around the center node
	    seedInitialPlacementofL1Nodes(center);

	    center_node_x = (node[0][center].__data__.x ? node[0][center].__data__.x : 0);
	    center_node_y = (node[0][center].__data__.y ? node[0][center].__data__.y : 0);

	    // calculate tmpOffset position for center node. Makes the transition of center node to Center of the Visualization field
	    if (tickCount < 200) {
		tmpOffset.x -= (clickedNodePos.x - offsetX) / 100;
		tmpOffset.y -= (clickedNodePos.y - offsetY) / 100;
	    }
	    //offset each node w.r.t center node which is at tmpOffset
	    node.each(function(d) {
		    d.x = d.x - center_node_x + tmpOffset.x;
		    d.y = d.y - center_node_y + tmpOffset.y;
		});

	    //if(tickCount<200)seedInitialPlacementofL2Nodes(true);
	    //if(tickCount==200)seedInitialPlacementofL2Nodes(false);

	    //Move the map to the left end if the nodes are going beyond the Visualization Pane boundary
	    adjustMapHorizontally(tickCount);

	    // update node size and nodes' fisheye parameter after fisheye distortion
	    addFisheyeDistortion(center_node_x, center_node_y);
	    
	    //update the node and link positions
	    updateNodePositions();
	    updateLinksPositions();
	    
	});
}

function simulateClick() {
    first = 0;
    click(node[0][center].__data__, 0);
    force.start();
}

function seedInitialPlacementofL1Nodes(center) {
    // find the number of groups
    var i;
    noOfGroups = 0;
    for (i = 0; i < adjacencyList[center].size; i++) {
        curL1NodeIndex = adjacencyList[center].connections[i].node_index;
        if (node[0][curL1NodeIndex].__data__.L1Group > noOfGroups) {
            noOfGroups = node[0][curL1NodeIndex].__data__.L1Group;
        }
    }

    // place each group elements together;
    nodeNumber = 0;
    theta = 2 * Math.PI / adjacencyList[center].size;
    
    for (i = 1; i <= noOfGroups; i++) {
        for (var j = 0; j < adjacencyList[center].size; j++) {
            curL1NodeIndex = adjacencyList[center].connections[j].node_index;
            groupNumber = node[0][curL1NodeIndex].__data__.L1Group;
            if (groupNumber == i) {
		//var edgeAngle = getAngle(node[0][curL1NodeIndex].__data__.x - node[0][center].__data__.x, node[0][curL1NodeIndex].__data__.y - node[0][center].__data__.y);
                //var r = ( (edgeAngle < Math.PI/8 || edgeAngle > 15*Math.PI/8) || (edgeAngle > 7*Math.PI/8 && edgeAngle < 9*Math.PI/8) ) ? (node[0][center].__data__.textWidth/2 + l1EdgeLength) : l1EdgeLength;
		node[0][curL1NodeIndex].__data__.x = node[0][center].__data__.x + (l1EdgeLength) * Math.cos(3 * Math.PI / 2 + nodeNumber * (theta + randDeviation));
                node[0][curL1NodeIndex].__data__.y = node[0][center].__data__.y + (l1EdgeLength) * Math.sin(3 * Math.PI / 2 + nodeNumber * (theta + randDeviation));
                //console.log(node[0][curL1NodeIndex].__data__.name + ", "+ nodeNumber + ", i:" + i + "groupNumeber: " + groupNumber);
                nodeNumber++;
                //d3.select(node[0][curL1NodeIndex]).classed("fixed", node[0][curL1NodeIndex].__data__.fixed = true);
            }
        }
    }
    //console.log(nodeNumber);
}

function adjustMapHorizontally(tickCount){
    var minX = VizWidth,
	maxX = 0;
    // adjust horizontally 
    if (tickCount > 150) {
	node.each(function(d) {
		if (!d.invisible) {
		    if (d.x + d.textWidth / 2 > maxX) maxX = d.x + d.textWidth;
		    if (d.x - d.textWidth / 2 < minX) minX = d.x - d.textWidth;
		}
	    });

	//console.log("max: " + maxX + ", " + document.getElementById("background").offsetWidth + ", " + minX);
	if (minX < 10 || maxX > VizWidth) {
	    node.each(function(d) {
		    d.x = d.x - minX + 10;
		});
	}
    }
}

function addFisheyeDistortion(center_node_x, center_node_y){
    fisheye.focus([center_node_x, center_node_y]);
    node.each(function(d) {
	    d.fisheye = fisheye(d);
	});
    
    //update node height and width based on levels and fisheye distortion
    node.selectAll("text").each(function(d) {
	    d.textWidth = this.getBBox().width;
	    d.textHeight = this.getBBox().height;
	});
    
    node.selectAll("rect").attr("width", function(d) {
	    return Math.max(d.fisheye.z * l1NodeWidth*WindowScaleFactor, d.textWidth * 1.2);
	}).attr("height", function(d) {
		return d.fisheye.z * l1NodeHeight*WindowScaleFactor;
	    }).attr("rx", function(d) {
		    return Math.max(d.fisheye.z * l1NodeWidth*WindowScaleFactor, d.textWidth * 1.2) * 0.5;
		}).attr("ry", function(d) {
			return d.fisheye.z * l1NodeHeight*WindowScaleFactor * 0.5;
		    });
}

function updateNodePositions(){
    node.attr("transform", function(d) {
	    return "translate(" + (d.fisheye.x - Math.max(d.fisheye.z * l1NodeWidth*WindowScaleFactor, d.textWidth * 1.2) / 2) + "," + (d.fisheye.y - (d.fisheye.z * l1NodeHeight*WindowScaleFactor) / 2) + ")";
	});

    node.selectAll("text").attr("transform", function(d) {
	    return "translate(" + Math.max(d.fisheye.z * l1NodeWidth*WindowScaleFactor, d.textWidth * 1.2) / 2 + "," + (d.fisheye.z * l1NodeHeight*WindowScaleFactor + d.textHeight / 2) / 2 + ")";
	}).style("font-family", function(d) {
		return "Arial";
	    }).style("font-size", function(d) {
		    return (d.level == 0) ? 25*WindowScaleFactor+"px" : 15*WindowScaleFactor+"px";
		}).style("font-style", function(d) {
			return (d.level == 0) ? "italic" : "normal";
		    });
}

function updateLinksPositions(){
    // find the intersection of the Links with the Rectangle and make x1,y1 and x2,y2 so that it is from boundary of the source to that of the target. 
    link.attr("x1", function(d) {
	    var width = Math.max(d.source.fisheye.z * l1NodeWidth*WindowScaleFactor, d.source.textWidth * 1.2);
	    var height = d.source.fisheye.z * l1NodeHeight*WindowScaleFactor;
	    var boxAngle = getAngle(width, height);
	    var edgeAngle = getAngle(d.target.fisheye.x - d.source.fisheye.x,
				     d.source.fisheye.y - d.target.fisheye.y);

	    var x1, y1, x2, y2;
	    var signFactorY = (edgeAngle < Math.PI) ? 1 : -1;
	    var signFactorX = (edgeAngle < Math.PI / 2 || edgeAngle > 3 * Math.PI / 2) ? 1 : -1;
	    if ((edgeAngle > boxAngle && edgeAngle < Math.PI - boxAngle) || (edgeAngle > Math.PI + boxAngle && edgeAngle < 2 * Math.PI - boxAngle)) {
		y1 = height / 2;
		x1 = Math.abs(y1 / Math.tan(edgeAngle));
	    } else {
		x1 = width / 2;
		y1 = Math.abs(x1 * Math.tan(edgeAngle));
	    }
	    
	    return d.source.fisheye.x + signFactorX * x1;

	}).attr("y1", function(d) {
		var width = Math.max(d.source.fisheye.z * l1NodeWidth*WindowScaleFactor, d.source.textWidth * 1.2);
		var height = d.source.fisheye.z * l1NodeHeight*WindowScaleFactor;
		var boxAngle = getAngle(width,
					height);
		var edgeAngle = getAngle(
					 d.target.fisheye.x - d.source.fisheye.x,
					 d.source.fisheye.y - d.target.fisheye.y);
		var x1, y1, x2, y2;
		var signFactorY = (edgeAngle < Math.PI) ? 1 : -1;
		var signFactorX = (edgeAngle < Math.PI / 2 || edgeAngle > 3 * Math.PI / 2) ? 1 : -1;
		if ((edgeAngle > boxAngle && edgeAngle < Math.PI - boxAngle) || (edgeAngle > Math.PI + boxAngle && edgeAngle < 2 * Math.PI - boxAngle)) {
		    y1 = height / 2;
		    x1 = Math.abs(y1 / Math.tan(edgeAngle));
		} else {
		    x1 = width / 2;
		    y1 = Math.abs(x1 * Math.tan(edgeAngle));
		}
		return d.source.fisheye.y - signFactorY * y1;

	    }).attr("x2", function(d) {
		    var width = Math.max(d.target.fisheye.z * l1NodeWidth*WindowScaleFactor, d.target.textWidth * 1.2);
		    var height = d.target.fisheye.z * l1NodeHeight*WindowScaleFactor;
		    var boxAngle = getAngle(width, height);
		    var edgeAngle = getAngle(d.target.fisheye.x - d.source.fisheye.x, d.source.fisheye.y - d.target.fisheye.y);
		    var x1, y1, x2, y2;
		    var signFactorY = (edgeAngle < Math.PI) ? 1 : -1;
		    var signFactorX = (edgeAngle < Math.PI / 2 || edgeAngle > 3 * Math.PI / 2) ? 1 : -1;
		    if ((edgeAngle > boxAngle && edgeAngle < Math.PI - boxAngle) || (edgeAngle > Math.PI + boxAngle && edgeAngle < 2 * Math.PI - boxAngle)) {
			y1 = height / 2;
			x1 = Math.abs(y1 / Math.tan(edgeAngle));
		    } else {
			x1 = width / 2;
			y1 = Math.abs(x1 * Math.tan(edgeAngle));
		    }
		    return d.target.fisheye.x - signFactorX * x1;

		}).attr("y2", function(d) {
			var width = Math.max(d.target.fisheye.z * l1NodeWidth*WindowScaleFactor, d.target.textWidth * 1.2);
			var height = d.target.fisheye.z * l1NodeHeight*WindowScaleFactor;
			var boxAngle = getAngle(width, height);
			var edgeAngle = getAngle(d.target.fisheye.x - d.source.fisheye.x, d.source.fisheye.y - d.target.fisheye.y);
			var x1, y1, x2, y2;
			var signFactorY = (edgeAngle < Math.PI) ? 1 : -1;
			var signFactorX = (edgeAngle < Math.PI / 2 || edgeAngle > 3 * Math.PI / 2) ? 1 : -1;
			if ((edgeAngle > boxAngle && edgeAngle < Math.PI - boxAngle) || (edgeAngle > Math.PI + boxAngle && edgeAngle < 2 * Math.PI - boxAngle)) {
			    y1 = height / 2;
			    x1 = Math.abs(y1 / Math.tan(edgeAngle));
			} else {
			    x1 = width / 2;
			    y1 = Math.abs(x1 * Math.tan(edgeAngle));
			}
			return d.target.fisheye.y + signFactorY * y1;

		    });

    link.selectAll("text").text(function(d) {
	    return d.invisible ? "" : (d.info);
	}).attr("x", function(d) {
		var edgeAngle = getAngle(d.target.fisheye.x - d.source.fisheye.x, d.source.fisheye.y - d.target.fisheye.y);
		var length = Math.sqrt( Math.pow(d.target.fisheye.x - d.source.fisheye.x,2) + Math.pow(d.source.fisheye.y - d.target.fisheye.y,2));
		return d.source.fisheye.x + 0.6*length*Math.cos(edgeAngle);
		//d.source.fisheye.x + d.target.fisheye.x / 2;
	    }).attr("y", function(d) {
		    var edgeAngle = getAngle(d.target.fisheye.x - d.source.fisheye.x, d.source.fisheye.y - d.target.fisheye.y);
		    var length = Math.sqrt( Math.pow(d.target.fisheye.x - d.source.fisheye.x,2) + Math.pow(d.source.fisheye.y - d.target.fisheye.y,2));
		    return d.source.fisheye.y - 0.6*length*Math.sin(edgeAngle);
		    //return (d.source.fisheye.y + d.target.fisheye.y) / 2;
		}).attr("text-anchor", "start")
	.attr("fill", function(d) {
		return "black";
	    });
}
