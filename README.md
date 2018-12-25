# Sample Canvas plugin - JSON enrichment and Plotly visualizations

WIP conversion for the new Kibana Canvas plugin structure, to be used with specific demos

![plotly3dcanvas](https://user-images.githubusercontent.com/1548516/54547448-03e13380-49a6-11e9-8da5-5344f51cd3c6.gif)

![annotated rig](https://user-images.githubusercontent.com/1548516/54570870-8dadf280-49e0-11e9-81cc-22697d0be873.gif)

## Use

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md) for instructions setting up your development environment. Once you have completed that, use the following yarn scripts.

Installation and use, starting in the `kibana` root directory (currently, with Kibana `v7.1.1`):

```
cd plugins
git clone https://github.com/monfera/canvas_plugin_examples.git
cd canvas_plugin_examples
yarn
cd ../..
nvm use
yarn kbn clean && yarn kbn bootstrap
yarn es snapshot
yarn start --no-base-path
```

Further steps

  - enable the test datasets in Kibana (flights, ecommerce etc.)
  - go to Canvas and add the Plotly scatterplot or 3D scatterplot test elements
  - as it's an example, there are some bugs, eg. both the element contents and Canvas will process mouse drags

## Development

Use [hacking-on-canvas](https://github.com/elastic/hacking-on-canvas) for future reference, although it may have not been updated for the new Canvas plugin style.
