/*jslint node: true */
/*jshint laxbreak: true */
/*jshint laxcomma: true */
"use strict";

var d3 = require("d3");
var _ = require("underscore");
var Evidence = require('./Evidence');
var Constants = require('./Constants');

var createTooltipBox = function(fv, container) {
    fv.globalContainer.select('.up_pftv_tooltip-container').remove();
    var tooltipContainer = container.append('div')
        .attr('class', 'up_pftv_tooltip-container');
    tooltipContainer.append('span')
        .text('x')
        .attr('class', 'up_pftv_tooltip-close')
        .on('click', function() {
            tooltipContainer.transition(20)
                .style('opacity', 0)
                .style('display', 'none');
            tooltipContainer.remove();
        });
    return tooltipContainer;
};

var getEvidenceText = function(tooltip, code, sources) {
    var acronym = Evidence.acronym[code];
    var publications = _.where(sources, { name: 'PubMed' }).length;
    publications += _.where(sources, { name: 'Citation' }).length;
    var evidenceText = '';
    if ((acronym === 'EXP') || (acronym === 'NAS')) {
        publications += _.filter(sources, function(s) {
            if (s.id && (s.id.indexOf('ref.') === 0)) {
                s.name = 'Citation';
                s.url = 'http://www.uniprot.org/uniprot/' + tooltip.accession + '#ref' + s.id.slice(4);
                return true;
            } else {
                return false;
            }
        }).length;
        evidenceText = publications + (publications > 1 ? ' Publications' : ' Publication');
    } else if (acronym === 'IC') {
        evidenceText = publications === 0 ?
            'Curated' :
            publications + (publications > 1 ? ' Publications' : ' Publication');
    } else if (acronym === 'ISS') {
        evidenceText = 'By similarity';
    } else if (acronym === 'ISM') {
        evidenceText = !sources || sources.length === 0 ? 'Sequence Analysis' : sources[0].name + ' annotation';
    } else if ((acronym === 'MIXM') || (acronym === 'MIXA')) {
        evidenceText = 'Combined sources';
    } else if ((acronym === 'MI') || (acronym === 'AI')) {
        evidenceText = 'Imported';
    } else if (acronym === 'AA') {
        var unirule = sources ?
            _.find(sources, function(source) {
                return source.url && (source.url.indexOf('unirule') !== -1);
            }) :
            false;
        var saas = sources ?
            _.find(sources, function(source) {
                return source.url && (source.url.indexOf('SAAS') !== -1);
            }) :
            false;
        var interpro = sources ?
            _.find(sources, function(source) {
                return source.name === 'Pfam';
            }) :
            false;
        evidenceText = unirule ? 'UniRule annotation' :
            saas ? 'SAAS annotation' :
            interpro ? 'InterPro annotation' :
            sources ? sources[0].name + ' annotation' : 'Automatic annotation';
    } else {
        evidenceText = code;
    }
    return evidenceText +
        (Evidence.text[code] ? ' (' + Evidence.text[code] + ')' : '');
};

var parseVariantDescription = function(data) {
    if (data.description) {
        var descriptionArray = data.description.split(/\[LSS_|\[SWP]: /g);
        descriptionArray = _.groupBy(descriptionArray, function(desc) {
            return desc.length === 0 ? 'NOTHING' :
                desc.indexOf(']: ') !== -1 ? 'LSS' : 'UP';
        });
        data.up_description = descriptionArray.UP ? descriptionArray.UP.join('; ') : undefined;
        data.lss_description = descriptionArray.LSS ?
            descriptionArray.LSS.join('; ').replace(/]: /g, ': ') : undefined;
    }
    if (Evidence.existAssociation(data.association)) {
        _.each(data.association, function(association) {
            if (association.description) {
                var index = association.description.indexOf('Ftid: ');
                if (index !== -1) {
                    data.ftId = association.description.substr(index + 6, 10);
                    association.description = (association.description.slice(0, index) +
                        association.description.slice(index + 16)).trim();
                }
            }
        });
    }
};

var addFtId = function(tooltip, ftId) {
    if (ftId) {
        var dataId = tooltip.table.append('tr');
        dataId.append('td').text('Feature ID');
        dataId.append('td').text(ftId);
    }
};

var addConsequence = function(tooltip, consequence) {
    if (consequence) {
        var dataId = tooltip.table.append('tr');
        dataId.append('td').text('Tissue Type');
        dataId.append('td').text(consequence.toUpperCase()).attr('class', 'bigbold');
    }
};

var addConsequence2 = function(tooltip, consequence2) {
    if (consequence2) {
        var dataId = tooltip.table.append('tr');
        dataId.append('td').text('State');
        dataId.append('td').text(consequence2.slice(-8).toUpperCase()).attr('class', 'bigbold');
    }
};

var addConsequence3 = function(tooltip, consequence3) {
    if (consequence3) {
        var dataId = tooltip.table.append('tr');
        dataId.append('td').text('Disease State');
        // dataId.append('td').text(consequence3);
		dataId.append('td').text(consequence3.toUpperCase()).attr('class', 'bigbold');
    }
};


// var addSequence1 = function(tooltip, Sequence1) {
    // if (addSequence1) {
        // var dataId = tooltip.table.append('tr');
        // dataId.append('td').text('Sequence');
        // dataId.append('td').text(Sequence1);
    // }
// };

var addDescription = function(tooltip, description) {
    if (description) {
        var dataDes = tooltip.table.append('tr');
        dataDes.append('td').text('Description');
        dataDes.append('td').text(description);
    }
};

var Tooltip = function(fv, catTitle, d, container, coordinates) {
    var tooltip = this;
    tooltip.data = d;
    tooltip.sequence = fv.sequence;
    tooltip.accession = fv.accession;
    tooltip.tooltipViewer = undefined;

    var tooltipContainer = createTooltipBox(fv, container);

    if (coordinates) {
        tooltipContainer.style('left', (coordinates.x + 10) + 'px')
            .style('top', coordinates.y + 'px')
            .transition(200)
            .style('opacity', 1)
            .style('display', 'block');
    } else {
        tooltipContainer.style('left', (d3.mouse(container.node())[0] + 10) + 'px')
            .style('top', d3.mouse(container.node())[1] + 'px')
            .transition(200)
            .style('opacity', 1)
            .style('display', 'block');
    }

    fv.globalContainer.select('.up_pftv_tooltip-container table').remove();

    tooltip.table = fv.globalContainer.select('.up_pftv_tooltip-container').append('table');
    tooltip.table
        .on('mousedown', function() { fv.overTooltip = true; })
        .on('mouseup', function() { fv.overTooltip = false; });

    var descRow = tooltip.table.append('tr');

    var tooltipTitle = tooltip.data.type + ' POSITION ' + tooltip.data.begin +
        (tooltip.data.end && (tooltip.data.end !== tooltip.data.begin) ? '-' + tooltip.data.end : '');
    descRow.append('th').attr('colspan', 2).text(tooltipTitle);

    var keys = tooltip.data.externalData ? _.keys(tooltip.data.externalData).join(', ') : undefined;
    if (keys || (tooltip.data.sourceType !== undefined)) {
        var dataSource = tooltip.table.append('tr');
        dataSource.append('td').text('Source');
        var sourceText = '';
        var isUniProt = false,
            isLSS = false;
        if (tooltip.data.sourceType === Evidence.variantSourceType.mixed) {
            sourceText = keys ? 'UniProt, large scale studies and custom data (' + keys + ')' :
                'UniProt and large scale studies';
        } else if (tooltip.data.sourceType === Evidence.variantSourceType.uniprot) {
            isUniProt = true;
            sourceText = keys ? 'UniProt and custom data (' + keys + ')' : 'UniProt';
        } else if (tooltip.data.sourceType === Evidence.variantSourceType.lss) {
            isLSS = true;
            sourceText = keys ? 'Large scale studies and custom data (' + keys + ')' : 'Large scale studies';
        } else {
            sourceText = 'Custom data (' + keys + ')';
        }
        dataSource.append('td').text(sourceText);
        parseVariantDescription(tooltip.data);
        if (isUniProt) {
            addFtId(tooltip, tooltip.data.ftId);
            addDescription(tooltip, tooltip.data.up_description, 'up_description');
        } else if (isLSS) {
            addDescription(tooltip, tooltip.data.lss_description, 'lss_description');
        }
    } else {
        addFtId(tooltip, tooltip.data.ftId);
        addDescription(tooltip, tooltip.data.description, 'description');
    }
};

var addEvidenceXRefLinks = function(tooltip, sourceRow, info) {
    if (!sourceRow) {
        sourceRow = tooltip.table.append('tr')
            .attr('class', 'up_pftv_evidence-source');

        sourceRow.append('td')
            .text('');
    }

    var list = sourceRow.append('td').text(info.index + ' ');
    _.each(info.elem, function(el, i) {
        var url = info.alternative === true ? el.alternativeUrl : el.url;
        list.append('span').append('a')
            .attr('href', url)
            .attr('target', '_blank')
            .text(function() {
                if (info.textAttr) {
                    return el[info.textAttr];
                } else {
                    return el.id;
                }
            });
        if (i !== (info.elem.length - 1)) {
            list.append('span').text(' | ');
        }
    });
};

Tooltip.prototype.addEvidences = function(evidences) {
    var tooltip = this;
    _.each(evidences, function(sources, eco) {
        sources = _.filter(sources, function(source) {
            return source !== undefined;
        });

        var typeRow = tooltip.table.append('tr')
            .attr('class', 'up_pftv_evidence-col');
        typeRow.append('td')
            .text('Evidence');
        var evidenceText = getEvidenceText(tooltip, eco, sources);
        typeRow.append('td')
            .text(evidenceText);

        var groupedSources = _.groupBy(sources, 'name');
        delete groupedSources['undefined'];

        _.each(groupedSources, function(elem, index) {
            addEvidenceXRefLinks(tooltip, undefined, { elem: elem, index: index });
            if (index === 'PubMed') {
                addEvidenceXRefLinks(tooltip, undefined, { elem: elem, index: 'EuropePMC', alternative: true });
            }
        });
    });
};

Tooltip.prototype.addRetrominer = function() {
    var tooltip = this;
    var end = tooltip.data.end ? tooltip.data.end : tooltip.data.begin;
    var type = tooltip.data.type.toLowerCase();
    if (((end - tooltip.data.begin) >= 3) && (!_.contains(Constants.getNoBlastTypes(), type))) {
        var RetroMiner = tooltip.table.append('tr');
        RetroMiner.append('td').text('Tools');
        //var url = Constants.getBlastURL() + tooltip.accession + '[' + tooltip.data.begin;
        //url += '-';
        //url += end + ']' + '&key=' + Constants.getTrackInfo(type).label;
        //if (tooltip.data.ftId) {
        //    url += '&id=' + tooltip.data.ftId;
        //}
        RetroMiner.append('td').append('span')
            .append('a')
            .attr('href', "https://github.com/Nazrath10R/Pride_Reanalysis/")
            .attr('target', '_blank')
            .text('RetroMiner');
    }
};

Tooltip.prototype.addSeq = function() {
    var tooltip = this;
    var end = tooltip.data.end ? tooltip.data.end : tooltip.data.begin;
    var type = tooltip.data.type.toLowerCase();
    if (((end - tooltip.data.begin) >= 3) && (!_.contains(Constants.getNoBlastTypes(), type))) {
        var addSeq = tooltip.table.append('tr');
        addSeq.append('td').text('Sequence');
        addSeq.append('td').append('span')
		.text(tooltip.data.Sequence1);
            // .append('a')
            // .attr('href', "https://github.com/Nazrath10R/Pride_Reanalysis/")
            // .attr('target', '_blank')
            
    }
};

var BasicTooltipViewer = function(tooltip) {
    tooltip.addEvidences(tooltip.data.evidences);
    addXRefs(tooltip, tooltip.data.xrefs);
    tooltip.addRetrominer();
	tooltip.addSeq();
};

var AntigenTooltipViewer = function(tooltip) {
    if (tooltip.data.matchScore) {
        var seqRow = tooltip.table.append('tr');
        seqRow.append('td').text('Alignment score');
        seqRow.append('td')
            .text(function() {
                return tooltip.data.matchScore + '%';
            });
    }
    tooltip.addEvidences(tooltip.data.evidences);
    addXRefs(tooltip, tooltip.data.xrefs);
    tooltip.addRetrominer();
};

var AlternativeTooltipViewer = function(tooltip, change, field) {
    if (tooltip.data[field]) {
        var seqRow = tooltip.table.append('tr');
        seqRow.append('td').text(change);
        seqRow.append('td')
            .text(function() {
                var end = tooltip.data.end ? tooltip.data.end : tooltip.data.begin;
                var original = tooltip.sequence.substring(+tooltip.data.begin - 1, +end);
                var text = original + ' > ' + tooltip.data[field];
                return text;
            });
    }
    tooltip.addEvidences(tooltip.data.evidences);
    addXRefs(tooltip, tooltip.data.xrefs);
    tooltip.addRetrominer();
};

var addFamily = function(tooltip, data) {
	if (data.siftPrediction && (data.siftPrediction !== '-')) {
		var PA2_fam = [ "PA2_1", "PA2_10", "PA2_11", "PA2_12", "PA2_13", "PA2_14", "PA2_15", "PA2_16", "PA2_17", "PA2_18", "PA2_19", "PA2_2", "PA2_20", "PA2_21", "PA2_22", "PA2_23", "PA2_24", "PA2_25", "PA2_26", "PA2_27", "PA2_28", "PA2_29", "PA2_3", "PA2_30", "PA2_31", "PA2_32", "PA2_33", "PA2_34", "PA2_35", "PA2_4", "PA2_5", "PA2_6", "PA2_7", "PA2_8", "PA2_9", "PA3_1" ] 

		var HS_fam = [ "HS_1", "HS_10", "HS_100", "HS_101", "HS_102", "HS_103", "HS_104", "HS_105", "HS_106", "HS_107", "HS_108", "HS_109", "HS_11", "HS_110", "HS_111", "HS_112", "HS_113", "HS_114", "HS_115", "HS_116", "HS_117", "HS_118", "HS_119", "HS_12", "HS_120", "HS_121", "HS_122", "HS_13", "HS_14", "HS_15", "HS_16", "HS_17", "HS_18", "HS_19", "HS_2", "HS_20", "HS_21", "HS_22", "HS_23", "HS_24", "HS_25", "HS_26", "HS_27", "HS_28", "HS_29", "HS_3", "HS_30", "HS_31", "HS_32", "HS_33", "HS_34", "HS_35", "HS_36", "HS_37", "HS_38", "HS_39", "HS_4", "HS_40", "HS_41", "HS_42", "HS_43", "HS_44", "HS_45", "HS_46", "HS_47", "HS_48", "HS_49", "HS_5", "HS_50", "HS_51", "HS_52", "HS_53", "HS_54", "HS_55", "HS_56", "HS_57", "HS_58", "HS_59", "HS_6", "HS_60", "HS_61", "HS_62", "HS_63", "HS_64", "HS_65", "HS_66", "HS_67", "HS_68", "HS_69", "HS_7", "HS_70", "HS_71", "HS_72", "HS_73", "HS_74", "HS_75", "HS_76", "HS_77", "HS_78", "HS_79", "HS_8", "HS_80", "HS_81", "HS_82", "HS_83", "HS_84", "HS_85", "HS_86", "HS_87", "HS_88", "HS_89", "HS_9", "HS_90", "HS_91", "HS_92", "HS_93", "HS_94", "HS_95", "HS_96", "HS_97", "HS_98", "HS_99" ]
		
		if (data.family == "PA2"){
			var family_name = PA2_fam
		} else if (data.family == "HS") {
			var family_name = HS_fam
		} else {
			var family_name = ""
		}
		
		var FamRow = tooltip.table.append('tr');
		FamRow.append('td').append('span').append('a')
			.attr('href', 'http://rtpea.com/ideogram/'+family_name)
			.attr('target', '_blank').text('Family');
		// var predictionText = data.family === "PA" ? "PA" : "N/A"; // Changed
		var predictionText = "Unknown"
		if (data.family){
			 predictionText = data.family
		} else { predictionText = "N/A"
		}
		FamRow.append('td').append('span').append('a')
			.attr('href', 'http://rtpea.com/ideogram/'+family_name)
			.attr('target', '_blank').text(predictionText);
	}
};
	
var addPredictions = function(tooltip, data) {
    if (data.frequency && (data.frequency !== 0)) {
        var freqRow = tooltip.table.append('tr');
        freqRow.append('td').append('span').append('a')
            .attr('href', 'http://www.ncbi.nlm.nih.gov/projects/SNP/docs/rs_attributes.html#gmaf')
            .attr('target', '_blank').text('Frequency (MAF)');
        freqRow.append('td').text(data.frequency);
    }
    // if (data.polyphenPrediction && (data.polyphenPrediction !== '-') && (data.polyphenInUse !== false)) {
        // var polyRow = tooltip.table.append('tr');
        // polyRow.append('td').append('span').append('a')
            // .attr('href', 'http://genetics.bwh.harvard.edu/pph2/dokuwiki/about')
            // .attr('target', '_blank').text('Polyphen');
        // var text = data.polyphenPrediction + ', score ' + data.polyphenScore;
        // polyRow.append('td').text(text);
    // }
	// if (data.siftPrediction && (data.siftPrediction !== '-') && (data.siftInUse !== false)) {
	// console.log(data[1])
	// data.externalData.Proteomics_QMUL.consequence2 == undefined || (data.consequence2 == undefined)
	if (data.siftPrediction && (data.siftPrediction !== '-')){
		if (data.consequence2 == undefined) {
        var DiseaseText = tooltip.table.append('tr');
        DiseaseText.append('td').append('span').append('a')
            .attr('href', 'http://rtpea.com/info')
            .attr('target', '_blank').text('State');
        var predictionText = 'Normal';;
        DiseaseText.append('td').text(predictionText);
		}
    }
	
    if (data.siftPrediction && (data.siftPrediction !== '-')) {
        var ConfRow = tooltip.table.append('tr');
        ConfRow.append('td').append('span').append('a')
            .attr('href', 'http://rtpea.com/browse')
            .attr('target', '_blank').text('Confidence');
        // var predictionText = data.siftPrediction + ', score ' + data.siftScore;
		var ConfLevel = "TBC"
		
		if (data.siftScore >= 0.8){
			ConfLevel = "High Confidence"
			var predictionText = 'Score: ' + data.siftScore *100 + '% - ' + ConfLevel;
			ConfRow.append('td').text(predictionText).attr('class', 'high_conf');
		} else if (data.siftScore < 0.8 && data.siftScore >= 0.4){
			ConfLevel = "Med Confidence"
			var predictionText = 'Score: ' + data.siftScore *100 + '% - ' + ConfLevel;
			ConfRow.append('td').text(predictionText).attr('class', 'med_conf');
		} else if (data.siftScore < 0.4 && data.siftScore >= 0) {
			ConfLevel = "Low Confidence"
			var predictionText = 'Score: ' + data.siftScore *100 + '% - ' + ConfLevel;
			ConfRow.append('td').text(predictionText).attr('class', 'low_conf');
		} else {
			ConfLevel = "TBC"
			var predictionText = 'Score: '+ ' - ' + ConfLevel;
			ConfRow.append('td').text(predictionText).attr('class', 'normbold ');
		}
		// var ConfLevel = "TBC"
		// if (data.siftScore >= 0.8){
			// ConfLevel = "High Confidence"
		// } else if (data.siftScore < 0.8 && data.siftScore >= 0.4){
			// ConfLevel = "Med Confidence"
		// } else if (data.siftScore < 0.4) {
			// ConfLevel = "Low Confidence"
		// } else {
			// ConfLevel = "TBC"
		// }
		// var predictionText = 'Score: ' + data.siftScore *100 + '% - ' + ConfLevel;
    
		// if (data.siftScore >= 0.8){
			// ConfRow.append('td').text(predictionText).attr('class', 'high_conf');
		// } else if (data.siftScore < 0.8 && data.siftScore >= 0.4){
			// ConfRow.append('td').text(predictionText).attr('class', 'med_conf');
		// } else if (data.siftScore < 0.4 && data.siftScore >= 0) {
			// ConfRow.append('td').text(predictionText).attr('class', 'low_conf');
		// } else {
			// ConfRow.append('td').text(predictionText).attr('class', 'bigbold');
		// }
		// ConfRow.append('td').text("this is test");
		// dataId.append('td').text(consequence.toUpperCase()).attr('class', 'bigbold');
		
    }
	
	
	if (data.siftPrediction && (data.siftPrediction !== '-')) {
        var ChrMap = tooltip.table.append('tr');
        ChrMap.append('td').append('span').append('a')
            // .attr('href', 'http://rtpea.com/ideogram/'+data.description)
			.attr('href', 'http://rtpea.com/ideogram/'+data.description)
            .attr('target', '_blank').text('Chr Mapper');
		ChrMap.append('td').append('span').append('a')
		// .attr('href', 'http://rtpea.com/ideogram/'+data.description)
		.attr('href', 'http://rtpea.com/ideogram/'+data.description)
		.attr('target', '_blank').text('Click to Map');
        // var predictionText = 'Click to Map';
        // ChrMap.append('td').text(predictionText).append('a')
			// .attr('href', 'http://localhost:3000/ideogram/'+data.description)
			// .attr('target', '_blank')
 
    }
};

var hasPredictions = function(data) {
    var response = false;
    if (data.frequency && (data.frequency !== 0)) {
        response = true;
    }
    if (data.polyphenPrediction && (data.polyphenPrediction !== '-') &&
        (data.polyphenPrediction !== 'unknown') && (data.polyphenInUse !== false)) {
        response = true;
    }
    if (data.siftPrediction && (data.siftPrediction !== '-') &&
        (data.siftPrediction !== 'unknown') && (data.siftInUse !== false)) {
        response = true;
    }
    return response;
};

var addAssociation = function(tooltip) {
    if (Evidence.existAssociation(tooltip.data.association)) {
        var assocRow = tooltip.table.append('tr');
        assocRow.append('td').attr('colspan', 2).classed('up_pftv_subsection', true).text('Disease Association');
        _.each(tooltip.data.association, function(association) {
            if (association.name) {
                var diseaseRow = tooltip.table.append('tr');
                diseaseRow.append('td').text('Disease');
                diseaseRow.append('td').append('span').append('a')
                    .attr('href', 'http://www.uniprot.org/diseases/?query=' + association.name)
                    .attr('target', '_blank').text(association.name);
            }
            if (association.description) {
                var descRow = tooltip.table.append('tr');
                descRow.append('td').text('Description');
                // descRow.append('td').text(association.description);
				descRow.append('td').text("Peptide Variant Match");
            }
            if (association.xrefs) {
                var groupedSources = _.groupBy(association.xrefs, 'name');
                _.each(groupedSources, function(elem, index) {
                    var xrefs = tooltip.table.append('tr');
                    xrefs.append('td');
                    var list = xrefs.append('td').text(index + ' ');

                    _.each(elem, function(el, index) {
                        list.append('span').append('a').attr('href', el.url)
                            .attr('target', '_blank').text(el.id);
                        if ((index + 1) !== elem.length) {
                            list.append('span').text(' | ');
                        }
                    });
                });
            }
            if (association.evidences) {
                tooltip.addEvidences(association.evidences);
            }
        });
    }
};

var addMutation = function(tooltip) {
    var mutRow = tooltip.table.append('tr');
    mutRow.append('td').text('Variant');
    var text = tooltip.data.wildType +
        ' > ' +
        tooltip.data.alternativeSequence;
    mutRow.append('td').text(text);
};

var addXRefs = function(tooltip, xrefs) {
    if (xrefs && (xrefs.length !== 0)) {
        var sourceRow = tooltip.table.append('tr')
            .attr('class', 'up_pftv_evidence-source');

        sourceRow.append('td')
            .text('Cross-references');

        var groupedSources = _.groupBy(xrefs, 'id');
        delete groupedSources['undefined'];

        var first = true;
        _.each(groupedSources, function(elem, key) {
            if (first) {
                addEvidenceXRefLinks(tooltip, sourceRow, { elem: elem, index: key, textAttr: 'name' });
                first = false;
            } else {
                addEvidenceXRefLinks(tooltip, undefined, { elem: elem, index: key, textAttr: 'name' });
            }
        });
    }
};

var addUPSection = function(tooltip, upEvidences, upXrefs) {
    if (tooltip.data.ftId || tooltip.data.up_description || (upEvidences.length !== 0) || tooltip.data.association) {
        var upRow = tooltip.table.append('tr').classed('up_pftv_section', true);
        upRow.append('td').attr('colspan', 2).text('UniProt');
        addFtId(tooltip, tooltip.data.ftId);
        addDescription(tooltip, tooltip.data.up_description, 'up_description');
        tooltip.addEvidences(upEvidences);
        addXRefs(tooltip, upXrefs);
        addAssociation(tooltip);
    }
};

var addSection = function(tooltip, data, ftId, description, evidences, xrefs, sectionTitle) {
    var hasEvidences = evidences && _.keys(evidences).length !== 0;
    xrefs = xrefs ? xrefs : [];
    if (data.ftId || description || (hasEvidences) || hasPredictions(data) || (xrefs.length !== 0) ||
        data.consequence || data.consequence2 || data.consequence3) {
        var lssRow = tooltip.table.append('tr').classed('up_pftv_section', true);
        lssRow.append('td').attr('colspan', 2).text(sectionTitle);
        addFtId(tooltip, ftId);
        addDescription(tooltip, description);
		addFamily(tooltip, data);
		if (data.consequence.slice(-8).toLowerCase() == "diseased"){
			addConsequence(tooltip, data.consequence.slice(0,-9));
		} else { 
			addConsequence(tooltip, data.consequence);
		}
		addConsequence2(tooltip, data.consequence2);
		addConsequence3(tooltip, data.consequence3);
		// addSequence1(tooltip, data.Sequence1);
        addPredictions(tooltip, data);
        tooltip.addEvidences(evidences);
        addXRefs(tooltip, xrefs);
    }
};

var VariantTooltipViewer = function(tooltip) {
    if (tooltip.data.sourceType === Evidence.variantSourceType.mixed) {
        var upEvidences = {},
            lssEvidences = {};
        _.each(tooltip.data.evidences, function(sources, eco) {
            if (_.contains(Evidence.manual, eco)) {
                upEvidences[eco] = tooltip.data.evidences[eco];
            } else {
                lssEvidences[eco] = tooltip.data.evidences[eco];
            }
        });
        var upXrefs = [],
            lssXrefs = [];
        _.each(tooltip.data.xrefs, function(xref) {
            if (xref.reviewed === true) {
                upXrefs.push(xref);
            } else {
                lssXrefs.push(xref);
            }
        });
        addMutation(tooltip);
        addUPSection(tooltip, upEvidences, upXrefs);
        addSection(tooltip, tooltip.data, undefined, tooltip.data.lss_description, lssEvidences, lssXrefs, 'Large' +
            ' Scale Studies');
    } else {
        addMutation(tooltip);
        addPredictions(tooltip, tooltip.data);
        tooltip.addEvidences(tooltip.data.evidences);
        addXRefs(tooltip, tooltip.data.xrefs);
        addAssociation(tooltip);
    }
    //There is only one external data source but we do not know the key name
    _.each(tooltip.data.externalData, function(data, key) {
        addSection(tooltip, data, data.ftId, data.description, data.evidences, data.xrefs, key);
    });
};

Tooltip.basic = function() {
    this.tooltipViewer = new BasicTooltipViewer(this);
};
Tooltip.antigen = function() {
    this.tooltipViewer = new AntigenTooltipViewer(this);
};
Tooltip.mutagen = function() {
    this.tooltipViewer = new AlternativeTooltipViewer(this, 'Mutation', 'alternativeSequence');
};
Tooltip.conflict = function() {
    this.tooltipViewer = new AlternativeTooltipViewer(this, 'Conflict', 'alternativeSequence');
};
Tooltip.missense = function() {
    this.tooltipViewer = new VariantTooltipViewer(this);
};
Tooltip.ms_del = function() {
    this.tooltipViewer = new VariantTooltipViewer(this);
};
Tooltip.insdel = function() {
    this.tooltipViewer = new VariantTooltipViewer(this);
};
Tooltip.stop_lost = function() {
    this.tooltipViewer = new VariantTooltipViewer(this);
};
Tooltip.stop_gained = function() {
    this.tooltipViewer = new VariantTooltipViewer(this);
};
Tooltip.init_codon = function() {
    this.tooltipViewer = new VariantTooltipViewer(this);
};
Tooltip.variant = function() {
    this.tooltipViewer = new VariantTooltipViewer(this);
};

var TooltipFactory = function() {
    return {
        createTooltip: function(fv, catTitle, data, container, coordinates) {
            var tooltip, type = data.type.toLowerCase();
            // error if the constructor doesn't exist
            if (typeof Tooltip[type] !== "function") {
                Tooltip.basic.prototype = new Tooltip(fv, catTitle, data, container, coordinates);
                tooltip = new Tooltip.basic();
            } else {
                Tooltip[type].prototype = new Tooltip(fv, catTitle, data, container, coordinates);
                tooltip = new Tooltip[type]();
            }
            return tooltip;
        }
    };
}();

module.exports = TooltipFactory;