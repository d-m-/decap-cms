import React from 'react';
import PropTypes from 'prop-types';
import { ClassNames } from '@emotion/core';
import olStyles from 'ol/ol.css';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import GeoJSON from 'ol/format/GeoJSON';
import { Draw, Modify } from 'ol/interaction.js';
import TileLayer from 'ol/layer/Tile.js';
import VectorLayer from 'ol/layer/Vector.js';
import OSMSource from 'ol/source/OSM.js';
import VectorSource from 'ol/source/Vector.js';
import { Style, Circle, Fill, Stroke } from 'ol/style.js';
import { transform } from 'ol/proj.js';


const formatOptions = {
  dataProjection: 'EPSG:4326',
  featureProjection: 'EPSG:3857',
};

const colorStroke = '#3a69c7';
const colorFill = '#3a69c744';

const style = new Style({
  image: new Circle({
    radius: 5,
    fill: new Fill({ color: colorFill }),
    stroke: new Stroke({ color: colorStroke, width: 2 }),
  }),
  fill: new Fill({ color: colorFill }),
  stroke: new Stroke({ color: colorStroke, width: 3 }),
})

function getDefaultFormat() {
  return new GeoJSON(formatOptions);
}

function getDefaultMap(target, featuresLayer, latitude, longitude, zoom) {
  console.log(latitude, longitude, zoom);
  return new Map({
    target,
    layers: [new TileLayer({ source: new OSMSource() }), featuresLayer],
    view: new View({ center: transform([longitude, latitude], 'EPSG:4326', 'EPSG:3857'), zoom }),
  });
}

export default function withMapControl({ getFormat, getMap } = {}) {
  return class MapControl extends React.Component {
    static propTypes = {
      onChange: PropTypes.func.isRequired,
      field: PropTypes.object.isRequired,
      height: PropTypes.string,
      value: PropTypes.node,
    };

    static defaultProps = {
      value: '',
      height: '400px',
    };

    constructor(props) {
      super(props);
      this.mapContainer = React.createRef();
    }

    componentDidMount() {
      const { field, onChange, value } = this.props;
      const format = getFormat ? getFormat(field) : getDefaultFormat(field);
      const features = value ? [format.readFeature(value)] : [];

      const featuresSource = new VectorSource({ features, wrapX: false });
      const featuresLayer = new VectorLayer({
        source: featuresSource,
        style,
      });

      const target = this.mapContainer.current;
      const map = getMap 
        ? getMap(target, featuresLayer) 
        : getDefaultMap(target, featuresLayer, field.get('latitude', 0), field.get('longitude', 0), field.get('zoom', 2));
      if (features.length > 0) {
        map.getView().fit(featuresSource.getExtent(), { maxZoom: 16, padding: [80, 80, 80, 80] });
      }

      const draw = new Draw({ source: featuresSource, type: field.get('type', 'Point') });
      map.addInteraction(draw);
      const modify = new Modify({ source: featuresSource });
      map.addInteraction(modify);

      const writeOptions = { decimals: field.get('decimals', 7) };
      draw.on('drawend', ({ feature }) => {
        featuresSource.clear();
        onChange(format.writeGeometry(feature.getGeometry(), writeOptions));
      });
    }

    render() {
      const { height } = this.props;

      return (
        <ClassNames>
          {({ cx, css }) => (
            <div
              className={cx(
                this.props.classNameWrapper,
                css`
                  ${olStyles};
                  padding: 0;
                  overflow: hidden;
                  height: ${height};
                `,
              )}
              ref={this.mapContainer}
            />
          )}
        </ClassNames>
      );
    }
  };
}
