﻿var processedArray=new Array();
d3.json("../JSON/temp.json",processedArray);
var width = 1050,
    height = 580;
var nodeAdded= new Set();

var fullscreen=true;

var svg = d3.select("#paperGraphArea")
    .append("svg")
    .attr("width",width)
    .attr("height",height);

var menuItems = ["Authorship", "Citedby", "References","Institutions"];
var authorMenuItems=["Co-author", "Institution"];
var institutionMenuItems=["Authorship","Papers"]

var force = d3.layout.force()
    .distance(100)
    .linkDistance([150])
    .charge(-500)
    .size([width, height])
    .gravity(0.1)
    .alpha(0);

//var url="http://localhost:9200/janusgraph_vertexes/_search?q=vType:paper&q=database&size=20";

  /*  d3.json("http://localhost:9200/janusgraph_vertexes/_search?q=vType:paper&q=database&size=20",function (error, jsonResult) {
    if (error) console.log(error.valueOf()) ;
    dataArray = jsonResult.hits.hits;
    processedArray=dataArray;
    console.log(dataArray)
    console.log(dataArray[0]._source)
});*/

function poplateClickedNode(nodeId,dataArray) {
    for(let i=0;i<dataArray.length;i++){
        if(nodeId===dataArray[i]._id && (!nodeAdded.has(nodeId))){
            processedArray.push(dataArray[i]);
            nodeAdded.add(nodeId);
            d3.selectAll("svg > *").remove();
            createGraph(processedArray,linksArray,false);
            break;
        }
    }
}


function createGraph(nodes, links, drawnodesOnly) {

//To form arrowhead
    svg.append("defs").selectAll("marker")
        .data(["arrowhead", "licensing", "resolved"])
        .enter().append("marker")
        .attr("id", function (d) {
            return d;
        })
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 24)
        .attr("refY", 0)
        .attr("markerWidth", 25)
        .attr("markerHeight", 15)
        .attr("orient", "auto")
        .append("path")
        .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
        .attr('fill', '#ccc')
        .attr('stroke', '#ccc');


    force.nodes(nodes)
        .links(links)
        .start();

    var link = svg.selectAll("link")
        .data(links)
        .enter().append("line")
        .attr("class", "link")
        .attr("marker-end", "url(#arrowhead)")
        .attr('fill', '#ccc')
        .attr('stroke', '#ccc');

    var node_drag = d3.behavior.drag()
        .on("dragstart", drag_start)
        .on("drag", drag_move)
        .on("dragend", drag_end);


    function drag_start(d, i) {
        force.stop() // stops the force auto positioning before you start dragging
    }

    function drag_move(d, i) {
        d.px += d3.event.dx;
        d.py += d3.event.dy;
        d.x += d3.event.dx;
        d.y += d3.event.dy;
        tick(); // this is the key to make it work together with updating both px,py,x,y on d !
    }

    function drag_end(d, i) {
        d.fixed = true; // set the node to fixed, so the force doesn't include the node in its auto positioning
        tick();
        force.resume();
    }

    var edgepaths = svg.selectAll(".edgepath")
        .data(links)
        .enter()
        .append('path')
        .attr({'d': function(d) { return 'M '+d.source.x+' '+d.source.y+' L '+ d.target.x +' '+d.target.y},
            'class':'edgepath',
            'fill-opacity':0,
            'stroke-opacity':0,
            'id':function(d,i) { return 'edgepath'+i;}})
        .style("pointer-events", "none");

    var edgelabels = svg.selectAll(".edgelabel")
        .data(links)
        .enter()
        .append('text')
        .style("pointer-events", "none")
        .attr({'class':'edgelabel',
            'id':function(d,i){return 'edgelabel'+i;},
            'dx':80,
            'dy':0,
            'font-size':10,
            'fill':'#aaa'});

    edgelabels.append("textPath")
        .attr('xlink:href',function(d,i) {return '#edgepath'+i})
        .style("pointer-events", "none")
        .text(function(d,i){
            if((d.target.type==="paper")||(d.target.type==="cite")){
                return "cited by"
            }else if(d.target.type==="author"){
                return "author"
            }else if(d.target.type==="reference"){
                return "refers to"
            }

        });


    var node = svg.selectAll("node")
        .data(nodes)
        .enter().append("g")
        .attr("class", "node")
        .call(node_drag);

    node.append("image")
        .attr("xlink:href", function (d) {
            if((d._source.vType==="paper") || (d._source.vType==="reference")||(d._source.vType==="cite")) {
                return "http://icons.iconarchive.com/icons/pelfusion/long-shadow-media/512/Document-icon.png"
            }
            else if (d.type==="author"){
                return "http://www.clker.com/cliparts/3/V/U/m/W/U/admin-button-icon-md.png"
            }
            else if(d.type==="institution"){
                return "http://www.freeiconspng.com/uploads/institution-icon-15.png"
            }
        })
        .attr("x", -8)
        .attr("y", -8)
        .attr("width",function (d) {
                return 30;
        })
        .attr("height", function (d) {
                return 30;
        })

        //to populate context menu
        .on('contextmenu', function (d, i) {
            // create the div element that will hold the context menu
            d3.selectAll('.context-menu').data([1])
                .enter()
                .append('div')
                .attr('class', 'context-menu');
            // close menu
            d3.select('body').on('click.context-menu', function () {
                d3.select('.context-menu').style('display', 'none');
            });
            // this gets executed when a context menu event occurs
            d3.selectAll('.context-menu')
                .html('')
                .append('ul')
                .selectAll('li')
                .data(function () {
                    if((d._source.vType==="paper")||(d._source.vType==="cite")||(d._source.vType==="reference"))
                        return menuItems;
                    else if((d.type==="author")){
                        return authorMenuItems;
                    }else{
                        return institutionMenuItems;
                    }

                }).enter()
                .append('li')
                .on('click', function (d) {
                    console.log("context menu-" +d);
                    if((d==="Authorship")){
                        showAuthors(paperId,processedArray);
                        paperExpanded.add(paperId);
                    }else if(d==="Citedby"){
                        showCitations(paperId,processedArray);
                    }else if(d==="References"){
                        showReferences(paperId);
                        nodeExpandedforRefernce.add(paperId);
                    }else if(d==="Institutions"){
                        showInstitution(paperId,processedArray);
                    }
                })
                .text(function (d) { console.log(d); return d;});


            d3.select('.context-menu').style('display', 'none');
            // show the context menu
            d3.select('.context-menu')
                .style('left',d3.event.pageX - 2 + 'px')
                .style('top', d3.event.pageY - 2 + 'px')
                .style('display', 'block');
            d3.event.preventDefault();
            var paperId = d._id;
        })
        //To display tooltip
        .on("mouseover", function (d) {
            if((d.type==="paper")||(d.type==="cite")){
                div.transition()
                    .duration(200)
                    .style("opacity", .9);
                div.html(d.title + "<br/>")
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 30) + "px");
            }
            else if(d.type==="author"){
                div.transition()
                    .duration(200)
                    .style("opacity", .9);
                div.html(d.authors + "<br/>")
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 30) + "px");
            }
        })
        //to disbale tooltip
        .on("mouseout", function (d) {
            div.transition()
                .duration(500)
                .style("opacity", 0);
        });

    node.append("title")
        .attr("dx", 20)
        .attr("dy", ".35em");


    node.append("text")
        .attr("dx", 20)
        .attr("dy", ".35em")
        .text(function (d) {
            if((d._source.vType==="paper")||(d.type==="cite")){
                return d._source.title;
            }
            else if(d.type==="author"){
                return d.authors;
            }
            else if(d.type==="reference"){
                return d.properties.title;
            }
            else if(d.type==="institution"){
                return d.name;
            }
        });

    //	Define the div for the tooltip
    var div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);
    if(!drawnodesOnly)
        force.on("tick",tick );
    else
        force.on("tick",node_tick );

    function node_tick() {
        node.attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });
    }

    function tick() {
        if (!drawnodesOnly) {
            link.attr("x1", function (d) {
                return d.source.x;
            })
                .attr("y1", function (d) {
                    return d.source.y;
                })
                .attr("x2", function (d) {
                    return d.target.x;
                })
                .attr("y2", function (d) {
                    return d.target.y;
                });


            node.attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            });

            edgepaths.attr('d', function (d) {
                return 'M ' + d.source.x + ' ' + d.source.y + ' L ' + d.target.x + ' ' + d.target.y;
            });

            edgelabels.attr('transform', function (d, i) {
                if (d.target.x < d.source.x) {
                    bbox = this.getBBox();
                    rx = bbox.x + bbox.width / 2;
                    ry = bbox.y + bbox.height / 2;
                    return 'rotate(180 ' + rx + ' ' + ry + ')';
                }
                else {
                    return 'rotate(0)';
                }
            });
        }
    }
}

function resize() {

    if(fullscreen){
        $("#graphArea").removeClass("startSize").addClass("newSize");

        fullscreen=false;
    }
    else{
        $("#graphArea").removeClass("newSize").addClass("startSize");

        fullscreen=true;
    }
}

function downloadGraphAsSVG() {
    try {
        var isFileSaverSupported = !!new Blob();
    } catch (e) {
        alert("blob not supported");
    }

    var graphDwn = d3.select("svg")
        .attr("version", 1.1)
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .node().parentNode.innerHTML;


    var blob = new Blob([graphDwn], {type: "image/svg+xml"});
    saveAs(blob, "scholarlyNetwork.svg");

}

function downloadGraphAsData() {
    var data=JSON.stringify(dataArray);
    var blob_json = new Blob([data], { type: 'text/data;charset=utf-8;' });
    saveAs(blob_json,"data.json");
}

