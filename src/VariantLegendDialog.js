/*jslint node: true */
/*jshint laxbreak: true */
/*jshint laxcomma: true */
"use strict";

var d3 = require("d3");
var _ = require("underscore");

var LegendDialog = function() {
    var createLegendRow = function(self, background, text) {
        var row = self.dialog.append('div').classed('up_pftv_legend', true);
        row.append('span')
            .classed('up_pftv_legendRect', true)
            .style('background-color', background);
        row.append('span')
            .classed('up_pftv_legendTitle', true)
            .text(text);
    };
    var populateDialog = function(self) {
        createLegendRow(self, self.UPDiseaseColor, 'Disease (UniProt)');
        createLegendRow(self, self.getPredictionColor(0), 'Deleterious (Large scale studies)');

        var colorScale = self.dialog.append('div');
        colorScale.selectAll('div')
            .data([0.2, 0.4, 0.6, 0.8])
            .enter().append('div')
            .classed('up_pftv_legend', true)
            .append('span')
            .classed('up_pftv_legendRect', true)
            .style('background-color', function(d) {
                return self.getPredictionColor(d);
            })
        ;

        createLegendRow(self, self.getPredictionColor(1), 'Benign (Large scale studies)');
        createLegendRow(self, self.UPNonDiseaseColor, 'Non-disease (UniProt)');
        createLegendRow(self, self.othersColor, 'Init codon, stop lost & gained');
    };

    return {
        UPDiseaseColor: '#990000',
        deleteriousColor: '#002594',
        benignColor: '#8FE3FF',
        UPNonDiseaseColor: '#99cc00',
        othersColor: '#FFCC00',
		HsHighColor: '#0b8700',
		HsLowColor: '#bbff56',
		PaHighColor: '#870E0E',
		PaLowColor: '#FF3535',
        // consequenceColors: ["#e78ac3","#fc8d62","#e5c494", "#762A83", "#B35806", "#ffffff","#000000"],
		consequenceColors: ["#5c8e00","#8e0700","#9e9000", "#513e3e", "#088700", "#008477","#35008c","#93009b","#00996f"],
		consequenceColors2: [{getPredictionColor: d3.scale.linear()
								.domain([0,1])
								.range(['#5c8e00','#dbff5b'])},
								{getPredictionColor: d3.scale.linear()
								.domain([0,1])
								.range(['#8e0700','#ff7f68'])},
								{getPredictionColor: d3.scale.linear()
								.domain([0,1])
								.range(['#9e9000','#fff05b'])},
								{getPredictionColor: d3.scale.linear()
								.domain([0,1])
								.range(['#513e3e','#cebbbb'])},
								{getPredictionColor: d3.scale.linear()
								.domain([0,1])
								.range(['#088700','#8eff87'])},
								{getPredictionColor: d3.scale.linear()
								.domain([0,1])
								.range(['#008477','#7ffff2'])},
								{getPredictionColor: d3.scale.linear()
								.domain([0,1])
								.range(['#35008c','#b78cff'])},
								{getPredictionColor: d3.scale.linear()
								.domain([0,1])
								.range(['#93009b','#f579fc'])},
								{getPredictionColor: d3.scale.linear()
								.domain([0,1])
								.range(['#00996f','#7affda'])}],
        getPredictionColor: d3.scale.linear()
            .domain([0,1])
            .range(['#002594','#8FE3FF']),
		getPredictionColor2: d3.scale.linear()
            .domain([0,1])
            .range(['#0b8700','#bbff56']),
		getPredictionColor3: d3.scale.linear()
            .domain([0,1])
            .range(['#870E0E','#FF3535']),
        createLegendDialog: function(container, fv) {
            this.dialog = container.append('div')
                .attr('class','up_pftv_dialog-container');
            populateDialog(this, fv);
            return this.dialog;
        }
    };
}();

module.exports = LegendDialog;