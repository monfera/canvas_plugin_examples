/*global kbnInterpreter */

import Plotly from 'plotly.js-dist'; // for plotting
import pupa from 'pupa'; // to assist with enriching the JSON
import Hjson from 'hjson'; // for convenience eg. not having to quote property names and being robust against missing commas; allow comments etc.
import { JSONPath } from 'jsonpath-plus'; // to assist with enriching the JSON

const json = () => ({
  name: 'json',
  aliases: [],
  type: 'json',
  help: 'Creates a JSON object',
  context: {
    types: [],
  },
  args: {
    object: {
      types: ['string', 'null'],
      help: 'JSON object as string',
      aliases: ['_'],
    },
  },
  fn: (context, { object }) => {
    return {
      type: 'json',
      object: Hjson.parse(object),
    };
  },
});

const enrich = () => {
  // a = {x: {}, y: [{key: 's', value: [2]}, {key: 'd', value: [3]}, {key: 'f', value: [4]}, ]}
  // jsonPath(a, "y[?(@.key==='d')]")[0].value.push(33)
  // todo switch to https://github.com/dchester/jsonpath due to full JS isolation, but consider cutting down on size
  // eg. via removing unneeded or rarely used features

  const enrich = (object, template, valueTemplate, rows, specifiedColumns) => {
    Object.values(rows).forEach(row => {
      Object.entries(row).forEach(([column, value]) => {
        if (specifiedColumns && specifiedColumns.indexOf(column) < 0) return;
        const tuple = { row, column, value };
        const path = pupa(template, tuple);
        const match = JSONPath(path, object);
        if (match) {
          match[0].push(Hjson.parse(pupa(valueTemplate, tuple)));
        }
      });
    });
    return object;
  };

  return {
    name: 'enrich',
    aliases: [],
    type: 'json',
    help: 'Enriches the input JSON object',
    context: {
      types: ['json'],
    },
    args: {
      path: {
        types: ['string'],
        help: 'Path to enrich',
      },
      table: {
        types: ['json', 'datatable', 'columntable', 'null'],
        help: 'Table to fill from',
      },
      value: {
        types: ['string'],
        help: 'Value to fill from',
        default: '"{{value}}"',
      },
      columns: {
        types: ['string', 'null'],
        help: 'Column(s) to pluck from',
      },
      push: {
        types: ['boolean'],
        help: 'Pushes value into an array (creates new array if needed)',
        options: [true, false],
        default: false,
      },
    },
    fn: (context, { path, table, value, columns, push }) => {
      const template = path;
      let object = context.object;
      const valueTemplate = value;

      const rows =
        table.type === 'json'
          ? [...table.object]
          : table.type === 'datatable'
          ? table.rows
          : table.columns[0].values.map((d, i) => {
              const row = {};
              table.columns.forEach(c => (row[c.name] = c.values[i]));
              return row;
            });

      const specifiedColumns = columns && columns.split(/[\s,]+/);
      return {
        type: 'json',
        object: enrich(object, template, valueTemplate, rows, specifiedColumns),
      };
    },
  };
};

const plotly = () => ({
  name: 'plotly',
  displayName: 'Plotly',
  help: 'Render a plotly plot',
  reuseDomNode: true,
  render(
    div,
    {
      object: { layout, data },
    },
    handlers
  ) {
    Plotly.newPlot(div, data, layout);
    handlers.done();
    handlers.onResize(() => {
      Plotly.relayout(div, { width: div.offsetWidth, height: div.offsetHeight });
    });
  },
});

const parcoords = () => ({
  name: 'plotly_parcoords',
  displayName: 'A-Parcoords',
  help: 'Plotly Parallel Coordinates',
  width: 600,
  height: 384,
  image:
    'data:image/png;base64,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/Y5FeO24t3Da4XiO+xFXRSliiyHJgdbhXvbXp88zVU3BRWWlzCCpuzcjvqC1hN8LO7dS4iYVXFeJE96twH8hDt7Rqyp6EAvgY8VW5pbWtpyjeTOyeuNiZN+yGSEbpj2Iyf8niK+tt9wT/MDWYPuRzVVu1obsAiQPSKEteB/XnrzbcU271EhzEs+PRhhEXCL3FCk0kOVorwc+gtvvBuLiiHIlUmXmM/oAliN+jaYCgvuszrtmIqbbM/RvpT683ELdAe2BtiJ+rgcR039HOR6UXm8zsqnh2/UaMiqya9Cw/VLPFagYM5ClbGfof5cg/rbcpiP9iNVxp1aIPyErZg5FVTn0WuMqjtV6nS/Uinw84pvrVWPLt7XyFlwSNaoHuhLJ59+o7/U64PvAgRBloM9qHpK+fAGyEucViGulOcQt9ui89XuTTXBfuvHqddnAC57CSBbjeGBsP6hDgF4qsHokcP4ZagDw9VwHyjV0O8r5EtqjNupfLPBsBvSvh4jX9hWo4FP0OpNaTzI6uugOe40B0U3Xv7i+1w4cq2T0t56K6mPaCNTp9UxhbFEYNyGLszurvUqmKoLDMMIJP7fudm0Jxe1Adse9txaWpFkSIaNWaUDWRZYitv3IQoH7auWmTHBGrZJEokWKJbcw4rpqDtNHk7D3atQw9UX+bg/wj4hlPFVL0Q3l6uHSFE6qk6WE7aqMSUmGsWckSyOuhiuB71IGa3OtCm4vuuwoz/ePI2vYTHBGWAYQh/9AiGMHEXdDG7JQ4NdUwNpcS0PKfmQt4WzEvxVMLLoJ+ASl5Q40JmcPdy0SynQFz98HL4v4azci60JvUtFlajRAFijjQl415Z6ApAk4HfGV5LYV2ljrD8KoPbROHQe8XP9mMLIz7C4k8n0bsH+81C2vAg/IQxymcX04aROaUWKdArFa1jGyMMIacMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDGP88/9Gsk3bTPZcwQAAAFZ0RVh0Y29tbWVudABGaWxlIHNvdXJjZTogaHR0cHM6Ly9jb21tb25zLndpa2ltZWRpYS5vcmcvd2lraS9GaWxlOlBsb3RseS1sb2dvLTAxLXNxdWFyZS5wbmeJc9U0AAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDE3LTAzLTI4VDIwOjUwOjUwKzAwOjAwwwCOJQAAACV0RVh0ZGF0ZTptb2RpZnkAMjAxNy0wMy0yOFQyMDo1MDo1MCswMDowMLJdNpkAAABNdEVYdHNvZnR3YXJlAEltYWdlTWFnaWNrIDYuOC45LTkgUTE2IHg4Nl82NCAyMDE3LTAzLTEyIGh0dHA6Ly93d3cuaW1hZ2VtYWdpY2sub3JnrC9D7QAAABh0RVh0VGh1bWI6OkRvY3VtZW50OjpQYWdlcwAxp/+7LwAAABh0RVh0VGh1bWI6OkltYWdlOjpIZWlnaHQAMjg1xWRr7gAAABd0RVh0VGh1bWI6OkltYWdlOjpXaWR0aAAyOTVPjgryAAAAGXRFWHRUaHVtYjo6TWltZXR5cGUAaW1hZ2UvcG5nP7JWTgAAABd0RVh0VGh1bWI6Ok1UaW1lADE0OTA3MzQyNTCYgrHaAAAAE3RFWHRUaHVtYjo6U2l6ZQA0LjUyS0JCRLDo7QAAAABJRU5ErkJggg==',
  expression: `filters
| json "{
    layout: {title: 'Parallel Coordinates Example'},
    data: [ {
      type: 'parcoords',
      line: { showscale: true, reversescale: true, colorscale: 'Jet', color: [] }
      dimensions: []
    } ]
  }"
| enrich table={filters | essql "SELECT DistanceMiles, AvgTicketPrice FROM kibana_sample_data_flights LIMIT 1"}
         path="data[0].dimensions"
         value="{label: '{{column}}', values: []}"
| enrich table={filters | essql "SELECT DistanceMiles FROM kibana_sample_data_flights"}
         path="data[0].line.color"
         value="{{value}}"
| enrich table={filters | essql "SELECT DistanceMiles, AvgTicketPrice FROM kibana_sample_data_flights"}
         path="data[0].dimensions[?(@.label==='{{column}}')].values"
         value="{{value}}"
| render as=plotly`,
});

const threed = () => ({
  name: 'plotly_threed',
  displayName: 'A-scatter3d',
  help: 'Plotly 3D Scatterplot',
  width: 500,
  height: 500,
  image:
    'data:image/png;base64,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/Y5FeO24t3Da4XiO+xFXRSliiyHJgdbhXvbXp88zVU3BRWWlzCCpuzcjvqC1hN8LO7dS4iYVXFeJE96twH8hDt7Rqyp6EAvgY8VW5pbWtpyjeTOyeuNiZN+yGSEbpj2Iyf8niK+tt9wT/MDWYPuRzVVu1obsAiQPSKEteB/XnrzbcU271EhzEs+PRhhEXCL3FCk0kOVorwc+gtvvBuLiiHIlUmXmM/oAliN+jaYCgvuszrtmIqbbM/RvpT683ELdAe2BtiJ+rgcR039HOR6UXm8zsqnh2/UaMiqya9Cw/VLPFagYM5ClbGfof5cg/rbcpiP9iNVxp1aIPyErZg5FVTn0WuMqjtV6nS/Uinw84pvrVWPLt7XyFlwSNaoHuhLJ59+o7/U64PvAgRBloM9qHpK+fAGyEucViGulOcQt9ui89XuTTXBfuvHqddnAC57CSBbjeGBsP6hDgF4qsHokcP4ZagDw9VwHyjV0O8r5EtqjNupfLPBsBvSvh4jX9hWo4FP0OpNaTzI6uugOe40B0U3Xv7i+1w4cq2T0t56K6mPaCNTp9UxhbFEYNyGLszurvUqmKoLDMMIJP7fudm0Jxe1Adse9txaWpFkSIaNWaUDWRZYitv3IQoH7auWmTHBGrZJEokWKJbcw4rpqDtNHk7D3atQw9UX+bg/wj4hlPFVL0Q3l6uHSFE6qk6WE7aqMSUmGsWckSyOuhiuB71IGa3OtCm4vuuwoz/ePI2vYTHBGWAYQh/9AiGMHEXdDG7JQ4NdUwNpcS0PKfmQt4WzEvxVMLLoJ+ASl5Q40JmcPdy0SynQFz98HL4v4azci60JvUtFlajRAFijjQl415Z6ApAk4HfGV5LYV2ljrD8KoPbROHQe8XP9mMLIz7C4k8n0bsH+81C2vAg/IQxymcX04aROaUWKdArFa1jGyMMIacMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDGP88/9Gsk3bTPZcwQAAAFZ0RVh0Y29tbWVudABGaWxlIHNvdXJjZTogaHR0cHM6Ly9jb21tb25zLndpa2ltZWRpYS5vcmcvd2lraS9GaWxlOlBsb3RseS1sb2dvLTAxLXNxdWFyZS5wbmeJc9U0AAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDE3LTAzLTI4VDIwOjUwOjUwKzAwOjAwwwCOJQAAACV0RVh0ZGF0ZTptb2RpZnkAMjAxNy0wMy0yOFQyMDo1MDo1MCswMDowMLJdNpkAAABNdEVYdHNvZnR3YXJlAEltYWdlTWFnaWNrIDYuOC45LTkgUTE2IHg4Nl82NCAyMDE3LTAzLTEyIGh0dHA6Ly93d3cuaW1hZ2VtYWdpY2sub3JnrC9D7QAAABh0RVh0VGh1bWI6OkRvY3VtZW50OjpQYWdlcwAxp/+7LwAAABh0RVh0VGh1bWI6OkltYWdlOjpIZWlnaHQAMjg1xWRr7gAAABd0RVh0VGh1bWI6OkltYWdlOjpXaWR0aAAyOTVPjgryAAAAGXRFWHRUaHVtYjo6TWltZXR5cGUAaW1hZ2UvcG5nP7JWTgAAABd0RVh0VGh1bWI6Ok1UaW1lADE0OTA3MzQyNTCYgrHaAAAAE3RFWHRUaHVtYjo6U2l6ZQA0LjUyS0JCRLDo7QAAAABJRU5ErkJggg==',
  expression: `filters
| json "{ 
    layout: {
      title: 'Exploration wells'
      scene: {
        xaxis: {title: 'lat'},
        yaxis: {title: 'lon'},
        zaxis: {title: 'depth'},
        aspectmode: 'cube',
        camera: {
          up: {x: 0, y: 0, z: 1},
          center: {x: 0, y: 0, z: 0},
          eye: {x: 1.5, y: 1.5, z: 1.5},
        }
      },
      margin: {t: 65, b: 0, l: 0, r: 0},
      width: 500,
      height: 500
    }, 
    data: [ 
      { 
        type: 'scatter3d', 
        hoverinfo: 'x+y+text', 
        mode: 'markers+lines', 
        marker: { colorscale: 'Viridis', reversescale: true, size: 3, color: [] }, 
        line: {width: 2, color: 'green'},
        transforms: [{
          type: 'groupby',
          groups:[],
          styles: [
            {target: '15_9-F-1 A', value: {mode: 'markers', line: {color: 'red'}, marker: {color: 'red'}}},
            {target: '15_9-F-1 B', value: {mode: 'lines', line: {color: 'blue'}, marker: {color: 'blue'}}},
            # {target: '15_9-F-1 C', value: {mode: 'markers+lines', line: {color: 'green'}, marker: {color: 'green'}}},
            {target: '15_9-F-1', value: {line: {color: 'purple'}, marker: {color: 'magenta'}}} 
          ]
        }],
        x: [], 
        y: [],
        z: [],
        text: []
      },
      {
        type: 'scatter3d',
        mode: 'text',
        text: ['Platform', '<b>Best<br>drill</b>'],
        showlegend: false,
        x: [58.443, 58.451],
        y: [1.8875, 1.885],
        z: [30, -4600]
      },
      {
        type: 'surface',
        showscale: false,
        colorscale: 'Blues',
        opacity: 0.6,
         x: [58.441, 58.445],
         y: [1.885, 1.89],
         z: [[-100,-100], [-100, -100]]
      }
     ] 
  }"
| enrich table={filters | essql "select survey.location.lat as lat from wellbore_data order by well.wellbore.name, survey.depth"}
         path="data[0].x"
| enrich table={filters | essql "select survey.location.lon as lon from wellbore_data order by well.wellbore.name, survey.depth"}
         path="data[0].y"
| enrich table={filters | essql "select -survey.depth as depth from wellbore_data order by well.wellbore.name, survey.depth"}
         path="data[0].z"
| enrich table={filters | essql "select -survey.depth as depth from wellbore_data order by well.wellbore.name, survey.depth"}
         path="data[0].marker.color"
| enrich table={filters | essql "select well.wellbore.name as name from wellbore_data order by well.wellbore.name, survey.depth"}
         path="data[0].transforms[0].groups"
| render as=plotly`,
});

const streamgraph = () => ({
  name: 'plotly_streamgraph',
  displayName: 'A-streamgraph',
  help: 'Plotly 3D Streamgraph',
  width: 500,
  height: 500,
  image:
    'data:image/png;base64,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/Y5FeO24t3Da4XiO+xFXRSliiyHJgdbhXvbXp88zVU3BRWWlzCCpuzcjvqC1hN8LO7dS4iYVXFeJE96twH8hDt7Rqyp6EAvgY8VW5pbWtpyjeTOyeuNiZN+yGSEbpj2Iyf8niK+tt9wT/MDWYPuRzVVu1obsAiQPSKEteB/XnrzbcU271EhzEs+PRhhEXCL3FCk0kOVorwc+gtvvBuLiiHIlUmXmM/oAliN+jaYCgvuszrtmIqbbM/RvpT683ELdAe2BtiJ+rgcR039HOR6UXm8zsqnh2/UaMiqya9Cw/VLPFagYM5ClbGfof5cg/rbcpiP9iNVxp1aIPyErZg5FVTn0WuMqjtV6nS/Uinw84pvrVWPLt7XyFlwSNaoHuhLJ59+o7/U64PvAgRBloM9qHpK+fAGyEucViGulOcQt9ui89XuTTXBfuvHqddnAC57CSBbjeGBsP6hDgF4qsHokcP4ZagDw9VwHyjV0O8r5EtqjNupfLPBsBvSvh4jX9hWo4FP0OpNaTzI6uugOe40B0U3Xv7i+1w4cq2T0t56K6mPaCNTp9UxhbFEYNyGLszurvUqmKoLDMMIJP7fudm0Jxe1Adse9txaWpFkSIaNWaUDWRZYitv3IQoH7auWmTHBGrZJEokWKJbcw4rpqDtNHk7D3atQw9UX+bg/wj4hlPFVL0Q3l6uHSFE6qk6WE7aqMSUmGsWckSyOuhiuB71IGa3OtCm4vuuwoz/ePI2vYTHBGWAYQh/9AiGMHEXdDG7JQ4NdUwNpcS0PKfmQt4WzEvxVMLLoJ+ASl5Q40JmcPdy0SynQFz98HL4v4azci60JvUtFlajRAFijjQl415Z6ApAk4HfGV5LYV2ljrD8KoPbROHQe8XP9mMLIz7C4k8n0bsH+81C2vAg/IQxymcX04aROaUWKdArFa1jGyMMIacMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDGP88/9Gsk3bTPZcwQAAAFZ0RVh0Y29tbWVudABGaWxlIHNvdXJjZTogaHR0cHM6Ly9jb21tb25zLndpa2ltZWRpYS5vcmcvd2lraS9GaWxlOlBsb3RseS1sb2dvLTAxLXNxdWFyZS5wbmeJc9U0AAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDE3LTAzLTI4VDIwOjUwOjUwKzAwOjAwwwCOJQAAACV0RVh0ZGF0ZTptb2RpZnkAMjAxNy0wMy0yOFQyMDo1MDo1MCswMDowMLJdNpkAAABNdEVYdHNvZnR3YXJlAEltYWdlTWFnaWNrIDYuOC45LTkgUTE2IHg4Nl82NCAyMDE3LTAzLTEyIGh0dHA6Ly93d3cuaW1hZ2VtYWdpY2sub3JnrC9D7QAAABh0RVh0VGh1bWI6OkRvY3VtZW50OjpQYWdlcwAxp/+7LwAAABh0RVh0VGh1bWI6OkltYWdlOjpIZWlnaHQAMjg1xWRr7gAAABd0RVh0VGh1bWI6OkltYWdlOjpXaWR0aAAyOTVPjgryAAAAGXRFWHRUaHVtYjo6TWltZXR5cGUAaW1hZ2UvcG5nP7JWTgAAABd0RVh0VGh1bWI6Ok1UaW1lADE0OTA3MzQyNTCYgrHaAAAAE3RFWHRUaHVtYjo6U2l6ZQA0LjUyS0JCRLDo7QAAAABJRU5ErkJggg==',
  expression: `filters
| json "{ 
    layout: {
      title: 'Exploration wells'
      scene: {
        xaxis: {title: 'lat'},
        yaxis: {title: 'lon'},
        zaxis: {title: 'depth'},
  
        camera: {
          up: {x: 0, y: 0, z: 1},
          center: {x: 0, y: 0, z: 0},
          eye: {x: 1.5, y: 1.5, z: 1.5},
        }
      },
      margin: {t: 65, b: 0, l: 0, r: 0},
      width: 500,
      height: 500
    }, 
    data: [ 
      { 
        type: 'streamtube', 
        x: [], 
        y: [],
        z: [],
        u: [],
        v: [],
        w: []
      }
     ] 
  }"
| enrich table={filters | essql "select (survey.location.lat - 58.4475) * 200 as lat from wellbore_data"}
         path="data[0].x"
| enrich table={filters | essql "select (survey.location.lon - 1.89) * 100 as lon from wellbore_data"}
         path="data[0].y"
| enrich table={filters | essql "select (2000 - survey.depth) / 2000 as depth from wellbore_data"}
         path="data[0].z"
| enrich table={filters | essql "select 1 as u from wellbore_data"}
         path="data[0].u"
| enrich table={filters | essql "select 0.1 as v from wellbore_data"}
         path="data[0].v"
| enrich table={filters | essql "select 1 as w from wellbore_data"}
         path="data[0].w"
| render as=plotly`,
});

const scatter = () => ({
  name: 'plotly_scatter',
  displayName: 'A-Scatter',
  help: 'Plotly Scatterplot',
  width: 960,
  height: 600,
  image:
    'data:image/png;base64,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/Y5FeO24t3Da4XiO+xFXRSliiyHJgdbhXvbXp88zVU3BRWWlzCCpuzcjvqC1hN8LO7dS4iYVXFeJE96twH8hDt7Rqyp6EAvgY8VW5pbWtpyjeTOyeuNiZN+yGSEbpj2Iyf8niK+tt9wT/MDWYPuRzVVu1obsAiQPSKEteB/XnrzbcU271EhzEs+PRhhEXCL3FCk0kOVorwc+gtvvBuLiiHIlUmXmM/oAliN+jaYCgvuszrtmIqbbM/RvpT683ELdAe2BtiJ+rgcR039HOR6UXm8zsqnh2/UaMiqya9Cw/VLPFagYM5ClbGfof5cg/rbcpiP9iNVxp1aIPyErZg5FVTn0WuMqjtV6nS/Uinw84pvrVWPLt7XyFlwSNaoHuhLJ59+o7/U64PvAgRBloM9qHpK+fAGyEucViGulOcQt9ui89XuTTXBfuvHqddnAC57CSBbjeGBsP6hDgF4qsHokcP4ZagDw9VwHyjV0O8r5EtqjNupfLPBsBvSvh4jX9hWo4FP0OpNaTzI6uugOe40B0U3Xv7i+1w4cq2T0t56K6mPaCNTp9UxhbFEYNyGLszurvUqmKoLDMMIJP7fudm0Jxe1Adse9txaWpFkSIaNWaUDWRZYitv3IQoH7auWmTHBGrZJEokWKJbcw4rpqDtNHk7D3atQw9UX+bg/wj4hlPFVL0Q3l6uHSFE6qk6WE7aqMSUmGsWckSyOuhiuB71IGa3OtCm4vuuwoz/ePI2vYTHBGWAYQh/9AiGMHEXdDG7JQ4NdUwNpcS0PKfmQt4WzEvxVMLLoJ+ASl5Q40JmcPdy0SynQFz98HL4v4azci60JvUtFlajRAFijjQl415Z6ApAk4HfGV5LYV2ljrD8KoPbROHQe8XP9mMLIz7C4k8n0bsH+81C2vAg/IQxymcX04aROaUWKdArFa1jGyMMIacMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDGP88/9Gsk3bTPZcwQAAAFZ0RVh0Y29tbWVudABGaWxlIHNvdXJjZTogaHR0cHM6Ly9jb21tb25zLndpa2ltZWRpYS5vcmcvd2lraS9GaWxlOlBsb3RseS1sb2dvLTAxLXNxdWFyZS5wbmeJc9U0AAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDE3LTAzLTI4VDIwOjUwOjUwKzAwOjAwwwCOJQAAACV0RVh0ZGF0ZTptb2RpZnkAMjAxNy0wMy0yOFQyMDo1MDo1MCswMDowMLJdNpkAAABNdEVYdHNvZnR3YXJlAEltYWdlTWFnaWNrIDYuOC45LTkgUTE2IHg4Nl82NCAyMDE3LTAzLTEyIGh0dHA6Ly93d3cuaW1hZ2VtYWdpY2sub3JnrC9D7QAAABh0RVh0VGh1bWI6OkRvY3VtZW50OjpQYWdlcwAxp/+7LwAAABh0RVh0VGh1bWI6OkltYWdlOjpIZWlnaHQAMjg1xWRr7gAAABd0RVh0VGh1bWI6OkltYWdlOjpXaWR0aAAyOTVPjgryAAAAGXRFWHRUaHVtYjo6TWltZXR5cGUAaW1hZ2UvcG5nP7JWTgAAABd0RVh0VGh1bWI6Ok1UaW1lADE0OTA3MzQyNTCYgrHaAAAAE3RFWHRUaHVtYjo6U2l6ZQA0LjUyS0JCRLDo7QAAAABJRU5ErkJggg==',
  expression: `filters
| json "{ 
    layout: {
        title: 'Flight time vs. distance (with flight delay)', 
        xaxis: { title: { text: 'Flight time' }, hoverformat: ',.0f', ticksuffix: 'hrs', showticksuffix: 'all', domain: [0, 0.65] },
        xaxis2: { title: { text: 'Mean distance and delay by destination' }, hoverformat: ',.0f', showticksuffix: 'all', domain: [0.66, 0.95] },
        yaxis: { title: { text: 'Distance' }, hoverformat: ',.0f', tickprefix: ' ', ticksuffix: ' mil.', showticksuffix: 'last', domain: [0.5, 1]  },
        hovermode: 'closest',
        showlegend: false,
        bargap: 0.382
      }, 
    data: [ 
      { 
        type: 'scatter', 
        hoverinfo: 'x+y+text', 
        mode: 'markers', 
        marker: { colorscale: 'Viridis', 
                  reversescale: true, showscale: true, colorbar: { title: 'Delay<br>(mins)', thickness: 12 }, color: [], size: [], sizemode: 'radius', sizemin: 1, opacity: 0.5, line: { width: 0 } }, 
        xaxis: 'x',
        yaxis: 'y',
        x: [], 
        y: [],
        text: []
      },
      {
        type: 'scatter',
        mode: 'lines',
        line: { width: 4, color: 'tomato' },
        xaxis: 'x',
        yaxis: 'y',
        x: [],
        y: []
      },
      {
        type: 'bar',
        xaxis: 'x2',
        yaxis: 'y',
        x: [],
        y: [],
        marker: { color: [], colorscale: 'Viridis', 
                  reversescale: true }
      }  
     ] 
  }"
| enrich table={filters | essql "SELECT FlightTimeHour FROM kibana_sample_data_flights WHERE FlightDelayMin > 0 ORDER BY FlightDelayMin"}
         path="data[0].x"
| enrich table={filters | essql "SELECT DistanceMiles  FROM kibana_sample_data_flights WHERE FlightDelayMin > 0 ORDER BY FlightDelayMin"}
         path="data[0].y"
| enrich table={filters | essql "SELECT FlightDelayMin FROM kibana_sample_data_flights WHERE FlightDelayMin > 0 ORDER BY FlightDelayMin"}
         path="data[0].marker.color"
| enrich table={filters | essql "SELECT AvgTicketPrice / 150 as ratio FROM kibana_sample_data_flights WHERE FlightDelayMin > 0 ORDER BY FlightDelayMin"}
         path="data[0].marker.size"
| enrich table={filters | essql "SELECT CONCAT(CONCAT('🛫 ', OriginCityName), CONCAT('<br>🛬 ', DestCityName)) as Relation FROM kibana_sample_data_flights WHERE FlightDelayMin > 0 ORDER BY FlightDelayMin"}
         path="data[0].text"
| enrich table={filters | essql "SELECT ROUND(CONVERT(FlightTimeHour, SQL_FLOAT)) as ftime FROM kibana_sample_data_flights WHERE FlightDelayMin > 0 GROUP BY ftime"}
         path="data[1].x"
| enrich table={filters | essql "SELECT AVG(DistanceMiles) as dist, ROUND(CONVERT(FlightTimeHour, SQL_FLOAT)) as ftime FROM kibana_sample_data_flights WHERE FlightDelayMin > 0 GROUP BY ftime"}
         columns="dist"
         path="data[1].y"
| enrich table={filters | essql "SELECT AVG(DistanceMiles) as dist, DestCountry FROM kibana_sample_data_flights GROUP BY DestCountry ORDER BY DestCountry"}
         columns="DestCountry"
         path="data[2].x"
| enrich table={filters | essql "SELECT AVG(DistanceMiles) as dist, DestCountry FROM kibana_sample_data_flights GROUP BY DestCountry ORDER BY DestCountry"}
         columns="dist"
         path="data[2].y"
| enrich table={filters | essql "SELECT AVG(FlightDelayMin) as delay, DestCountry FROM kibana_sample_data_flights GROUP BY DestCountry ORDER BY DestCountry"}
         columns="delay"
         path="data[2].marker.color"
| render as=plotly`,
});

// Register our plugins
kbnInterpreter.register({
  elements: [parcoords, scatter, threed, streamgraph],
  browserFunctions: [enrich, json],
  renderers: [plotly],
});
