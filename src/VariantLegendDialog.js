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
		F1HighColor: '#C99A18',
		F1LowColor: '#8FE3FF',
        // consequenceColors: ["#e78ac3","#fc8d62","#e5c494", "#762A83", "#B35806", "#ffffff","#000000"],
		consequenceColors: ["#bae814","#e81e13","#e8d612", "#562727", "#26bc1c", "#17d8c5","#6017d8","#ce17d8","#17d8a4"],
        getPredictionColor: d3.scale.linear()
            .domain([0,1])
            .range(['#002594','#8FE3FF']),
		getPredictionColor2: d3.scale.linear()
            .domain([0,1])
            .range(['#C99A18','#F9B700']),
        createLegendDialog: function(container, fv) {
            this.dialog = container.append('div')
                .attr('class','up_pftv_dialog-container');
            populateDialog(this, fv);
            return this.dialog;
        }
    };
}();

module.exports = LegendDialog;