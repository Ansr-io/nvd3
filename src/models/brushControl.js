
nv.models.brushControl = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var lines = nv.models.line()
    , xAxis = nv.models.axis()
    , yAxis = nv.models.axis()
    , brush = d3.svg.brush()
    , legend = nv.models.legend()
    , interactiveLayer = nv.interactiveGuideline()
    ;

  var margin = {top: 30, right: 20, bottom: 50, left: 60}
    , color = nv.utils.defaultColor()
    , width = null
    , height = null
    , showLegend = false
    , brushExtent = null
    , showXAxis = true
    , showYAxis = true
    , rightAlignYAxis = false
    , useInteractiveGuideline = false
    , tooltips = false
    , x
    , y
    , state = {}
    , defaultState = null
    , noData = 'No Data Available.'
    , dispatch = d3.dispatch('stateChange', 'changeState', 'brushstart', 'brush', 'brushend')
    , transitionDuration = 250
    ;

  xAxis
    .orient('bottom')
    .tickPadding(12)
    ;
  yAxis
    .orient((rightAlignYAxis) ? 'right' : 'left')
    ;

  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this),
          that = this;

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;


      chart.update = function() { container.transition().duration(transitionDuration).call(chart) };
      chart.container = this;

      //set state.disabled
      state.disabled = data.map(function(d) { return !!d.disabled });

    
      if (!defaultState) {
        var key;
        defaultState = {};
        for (key in state) {
          if (state[key] instanceof Array)
            defaultState[key] = state[key].slice(0);
          else
            defaultState[key] = state[key];
        }
      }

      //------------------------------------------------------------
      // Display noData message if there's nothing to show.

      if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
        var noDataText = container.selectAll('.nv-noData').data([noData]);

        noDataText.enter().append('text')
          .attr('class', 'nvd3 nv-noData')
          .attr('dy', '-.7em')
          .style('text-anchor', 'middle');

        noDataText
          .attr('x', margin.left + availableWidth / 2)
          .attr('y', margin.top + availableHeight / 2)
          .text(function(d) { return d });

        return chart;
      } else {
        container.selectAll('.nv-noData').remove();
      }

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup Scales

      x = lines.xScale();
      y = lines.yScale();

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.nv-wrap.nv-lineChart').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-lineChart nv-brushBackground').append('g');
      var g = wrap.select('g');

      gEnter.append("rect").style("opacity",0);
      gEnter.append('g').attr('class', 'nv-x nv-axis');
      gEnter.append('g').attr('class', 'nv-y nv-axis');
      gEnter.append('g').attr('class', 'nv-linesWrap');
      gEnter.append('g').attr('class', 'nv-legendWrap');
      gEnter.append('g').attr('class', 'nv-interactive');

      gEnter.append('g').attr('class', 'nv-brushBackground');
      gEnter.append('g').attr('class', 'nv-x nv-brush');

      g.select("rect").attr("width",availableWidth).attr("height",availableHeight);
      //------------------------------------------------------------
      // Legend

      if (showLegend) {
        legend.width(availableWidth);

        g.select('.nv-legendWrap')
            .datum(data)
            .call(legend);

        if ( margin.top != legend.height()) {
          margin.top = legend.height();
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;
        }

        wrap.select('.nv-legendWrap')
            .attr('transform', 'translate(0,' + (-margin.top) +')')
      }

      //------------------------------------------------------------

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      if (rightAlignYAxis) {
          g.select(".nv-y.nv-axis")
              .attr("transform", "translate(" + availableWidth + ",0)");
      }

      //------------------------------------------------------------
      // Main Chart Component(s)


      lines
        .interactive(false)
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color(d, i);
        }).filter(function(d,i) { return !data[i].disabled }));


      var linesWrap = g.select('.nv-linesWrap')
          .datum(data.filter(function(d) { return !d.disabled }))

      linesWrap.transition().call(lines);

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup Axes

      if (showXAxis) {
        xAxis
          .scale(x)
          .ticks( availableWidth / 100 )
          .tickSize(-availableHeight, 0);

        g.select('.nv-x.nv-axis')
            .attr('transform', 'translate(0,' + y.range()[0] + ')');

        g.select('.nv-x.nv-axis')
            .transition()
            .call(xAxis);
      }

      if (showYAxis) {
        yAxis
          .scale(y)
          .ticks( availableHeight / 36 )
          .tickSize( -availableWidth, 0);

        g.select('.nv-y.nv-axis')
            .transition()
            .call(yAxis);
      }
      //------------------------------------------------------------


        //------------------------------------------------------------
        // Setup Brush

        brush
            .x(x)
            .on('brushstart', onBrushStart)
            .on('brush', onBrush)
            .on('brushend', onBrushEnd);

        if (brushExtent) brush.extent(brushExtent);

        var brushBG = g.select('.nv-brushBackground').selectAll('g')
            .data([brushExtent || brush.extent()])

        var brushBGenter = brushBG.enter()
            .append('g');

        brushBGenter.append('rect')
            .attr('class', 'left')
            .attr('x', 0)
            .attr('y', 0)
            .attr('height', availableHeight);

        brushBGenter.append('rect')
            .attr('class', 'right')
            .attr('x', 0)
            .attr('y', 0)
            .attr('height', availableHeight);

        var gBrush = g.select('.nv-x.nv-brush')
            .call(brush);

        gBrush.selectAll('rect')
            //.attr('y', -5)
            .attr('height', availableHeight);

        gBrush.selectAll('.resize').append('path').attr('d', resizePath);

        onBrush();

        //------------------------------------------------------------


        // Taken from crossfilter (http://square.github.com/crossfilter/)
        function resizePath(d) {
            var e = +(d == 'e'),
                x = e ? 1 : -1,
                y = availableHeight / 3;
            return 'M' + (.5 * x) + ',' + y
                + 'A6,6 0 0 ' + e + ' ' + (6.5 * x) + ',' + (y + 6)
                + 'V' + (2 * y - 6)
                + 'A6,6 0 0 ' + e + ' ' + (.5 * x) + ',' + (2 * y)
                + 'Z'
                + 'M' + (2.5 * x) + ',' + (y + 8)
                + 'V' + (2 * y - 8)
                + 'M' + (4.5 * x) + ',' + (y + 8)
                + 'V' + (2 * y - 8);
        }

        function updateBrushBG() {
            if (!brush.empty()) brush.extent(brushExtent);
            brushBG
                .data([brush.empty() ? x.domain() : brushExtent])
                .each(function(d,i) {
                    var leftWidth = x(d[0]) - x.range()[0],
                        rightWidth = x.range()[1] - x(d[1]);
                    d3.select(this).select('.left')
                        .attr('width',  leftWidth < 0 ? 0 : leftWidth);

                    d3.select(this).select('.right')
                        .attr('x', x(d[1]))
                        .attr('width', rightWidth < 0 ? 0 : rightWidth);
                });
        }


        function getBrushExtent() {
            brushExtent = brush.empty() ? null : brush.extent();
            var extent = brush.empty() ? x.domain() : brush.extent();

            //The brush extent cannot be less than one.  If it is, don't update the line chart.
            if (Math.abs(extent[0] - extent[1]) <= 1) {
                return null;
            }

            return extent;
        };

        function onBrush() {
            var extent = getBrushExtent();
            if (extent === null)
                return;

            dispatch.brush({extent: extent, brush: brush});
            updateBrushBG();
        }

        function onBrushStart() {
            var extent = getBrushExtent();
            if (extent === null)
                return;

            dispatch.brushstart({extent: extent, brush: brush});
            updateBrushBG();
        }
        function onBrushEnd() {
            var extent = getBrushExtent();
            if (extent === null)
                return;

            dispatch.brushend({extent: extent, brush: brush});
            updateBrushBG();
        }

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      legend.dispatch.on('stateChange', function(newState) {
          state = newState;
          dispatch.stateChange(state);
          chart.update();
      });

      dispatch.on('changeState', function(e) {

        if (typeof e.disabled !== 'undefined') {
          data.forEach(function(series,i) {
            series.disabled = e.disabled[i];
          });

          state.disabled = e.disabled;
        }

        chart.update();
      });

      //============================================================

    });

    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.lines = lines;
  chart.legend = legend;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;
  chart.interactiveLayer = interactiveLayer;

  d3.rebind(chart, lines, 'defined', 'isArea', 'x', 'y', 'size', 'xScale', 'yScale', 'xDomain', 'yDomain', 'xRange', 'yRange'
    , 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'useVoronoi','id', 'interpolate');

  chart.options = nv.utils.optionsFunc.bind(chart);

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    legend.color(color);
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) return showLegend;
    showLegend = _;
    return chart;
  };

  chart.showXAxis = function(_) {
    if (!arguments.length) return showXAxis;
    showXAxis = _;
    return chart;
  };

  chart.showYAxis = function(_) {
    if (!arguments.length) return showYAxis;
    showYAxis = _;
    return chart;
  };

  chart.rightAlignYAxis = function(_) {
    if(!arguments.length) return rightAlignYAxis;
    rightAlignYAxis = _;
    yAxis.orient( (_) ? 'right' : 'left');
    return chart;
  };

  chart.state = function(_) {
    if (!arguments.length) return state;
    state = _;
    return chart;
  };

  chart.defaultState = function(_) {
    if (!arguments.length) return defaultState;
    defaultState = _;
    return chart;
  };

  chart.noData = function(_) {
    if (!arguments.length) return noData;
    noData = _;
    return chart;
  };

  chart.transitionDuration = function(_) {
    if (!arguments.length) return transitionDuration;
    transitionDuration = _;
    return chart;
  };

  //============================================================


  return chart;
}
