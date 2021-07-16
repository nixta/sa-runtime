const express = require('express');
const morgan = require("morgan");
const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');

// Create Express Server
const app = express();

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = "localhost";
const API_SERVICE_URL = "https://analysis.arcgis.com";

// Logging
app.use(morgan('dev'));

// Info GET endpoint
app.get('/nixta', (req, res, next) => {
  res.send('This is a proxy service which proxies to Billing and Account APIs.');
});

// Proxy endpoints
// app.use('/sa-runtime', createProxyMiddleware({
app.use(['override-only','', 'override-and-replace'], createProxyMiddleware({
  target: API_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
      [`^/override-only`]: '',
      [`^/override-and-replace`]: ''
  },
  selfHandleResponse: true,
  onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
    if (req.originalUrl.startsWith('/override-and-replace')) {
      return fixDataType(responseBuffer, proxyRes, req, res, true, true)
    }
    return fixDataType(responseBuffer, proxyRes, req, res, false, true)
  })
}));

function fixDataType(responseBuffer, proxyRes, req, res, replaceDataType, injectDataTypeOverride) {
  // detect json responses
  // console.log(proxyRes.headers);
  // console.log(req.url);

  var data = null;

  if (proxyRes.headers['content-type'] !== undefined && proxyRes.headers['content-type'].includes('application/json')) {
    console.log("JSON");
    data = JSON.parse(responseBuffer.toString('utf8'));

    // manipulate JSON data here
    // data = Object.assign({}, data, { "isMockService": true });  
  } else {
    console.log("NOT JSON");
    return responseBuffer;
  }

  const match = req.url.match(/^\/arcgis\/rest\/services\/tasks\/GPServer\/([a-zA-Z]+)\/jobs\/[^\/]+\/results\/([a-zA-Z]+)/);
  // console.log(match);

  if (match !== null) {
    const toolName = match[1];
    const parameterName = match[2];
    console.log(toolName);
    console.log(parameterName);

    if (data !== null) {
      console.log(data);

      let dataType = data["dataType"];
      let value = data["value"];

      var dataTypeOverride = getOverrideTypeFor(toolName, parameterName, dataType, value);

      console.log(`${dataType} --> ${dataTypeOverride} (value: "${value}")`);

      if (injectDataTypeOverride) {
        data = Object.assign({}, data, { "dataTypeOverride": dataTypeOverride });  
      }

      if (replaceDataType) {
        data = Object.assign({}, data, { "dataType": dataTypeOverride });  
      }

      // return manipulated JSON
      return JSON.stringify(data);
    }
  } else {
    console.log("no match");
  }

  // return other content-types as-is
  return responseBuffer;
}

function getOverrideTypeFor(toolName, parameterName, dataType, value) {
  console.log(arguments);

  // Special case. Empty values mean the parameter was not output, so do not override anything.
  if (value === '') { 
    return dataType;
  }

  // Try to find a match for tool and output parameter
  let toolParameters = typeLookups[toolName.toLowerCase()];
  console.log("Found Tool!");
  console.log(toolParameters);
  if (toolParameters !== undefined) {
    let dataTypeOverride = toolParameters[parameterName.toLowerCase()];

    if (dataTypeOverride !== undefined) {
      // Found a match. Return the override type.
      return dataTypeOverride;
    }
  }

  // No override found. Return the original type.
  return dataType;
}

// Start the Proxy
app.listen(PORT, () => {
  console.log(`Starting Proxy at ${HOST}:${PORT}`);
});

const typeLookups = {
  "aggregatepoints": {
      "aggregatedlayer": "GPFeatureRecordSetLayer",
      "groupsummary": "GPRecordSet"
    },
  "calculatedensity": {
      "resultlayer": "GPFeatureRecordSetLayer"
    },
  "choosebestfacilities": {
      "allocateddemandlocationslayer": "GPFeatureRecordSetLayer",
      "allocationlineslayer": "GPFeatureRecordSetLayer",
      "assignedfacilitieslayer": "GPFeatureRecordSetLayer"
    },
  "connectoriginstodestinations": {
      "routeslayer": "GPFeatureRecordSetLayer",
      "unassignedoriginslayer": "GPFeatureRecordSetLayer",
      "unassigneddestinationslayer": "GPFeatureRecordSetLayer",
      "routelayeritems": "Array of PortalItems"
    },
  "createbuffers": {
      "bufferlayer": "GPFeatureRecordSetLayer"
    },
  "createdrivetimeareas": {
      "drivetimeareaslayer": "GPFeatureRecordSetLayer",
      "reachablestreetslayer": "GPFeatureRecordSetLayer"
    },
  "createthresholdareas": {
      "resultlayer": "GPFeatureRecordSetLayer"
    },
  "createviewshed": {
      "viewshedlayer": "GPFeatureRecordSetLayer"
    },
  "createwatersheds": {
      "watershedlayer": "GPFeatureRecordSetLayer"
    },
  "derivenewlocations": {
      "resultlayer": "GPFeatureRecordSetLayer"
    },
  "dissolveboundaries": {
      "dissolvedlayer": "GPFeatureRecordSetLayer"
    },
  "enrichlayer": {
      "enrichedlayer": "GPFeatureRecordSetLayer"
    },
  "extractdata": {
      "contentid": "PortalItem"
    },
  "findcentroids": {
      "outputlayer": "GPFeatureRecordSetLayer"
    },
  "findexistinglocations": {
      "resultlayer": "GPFeatureRecordSetLayer"
    },
  "findhotspots": {
      "hotspotsresultlayer": "GPFeatureRecordSetLayer",
      "processinfo": "GPString"
    },
  "findnearest": {
      "nearestlayer": "GPFeatureRecordSetLayer",
      "connectinglineslayer": "GPFeatureRecordSetLayer",
      "routelayeritems": "Array of PortalItems"
    },
  "findoutliers": {
      "outliersresultlayer": "GPFeatureRecordSetLayer",
      "processinfo": "GPString"
    },
  "findpointclusters": {
      "pointclustersresultlayer": "GPFeatureRecordSetLayer"
    },
  "findsimilarlocations": {
      "similarresultlayer": "GPFeatureRecordSetLayer",
      "processinfo": "GPString"
    },
  "generatetessellations": {
      "tessellationlayer": "GPFeatureRecordSetLayer"
    },
  "interpolatepoints": {
      "resultlayer": "GPFeatureRecordSetLayer",
      "predictionerror": "GPRecordSet",
      "predictedpointlayer": "GPFeatureRecordSetLayer"
    },
  "joinfeatures": {
      "outputlayer": "GPFeatureRecordSetLayer or GPRecordSet"
    },
  "mergelayers": {
      "mergedlayer": "GPFeatureRecordSetLayer"
    },
  "overlaylayers": {
      "outputlayer": "GPFeatureRecordSetLayer"
    },
  "planroutes": {
      "routeslayer": "GPFeatureRecordSetLayer",
      "assignedstopslayer": "GPFeatureRecordSetLayer",
      "unassignedstopslayer": "GPFeatureRecordSetLayer",
      "routelayeritems": "Array of PortalItems"
    },
  "summarizecenteranddispersion": {
      "centralfeatureresultlayer": "GPFeatureRecordSetLayer",
      "meancenterresultlayer": "GPFeatureRecordSetLayer",
      "mediancenterresultlayer": "GPFeatureRecordSetLayer",
      "ellipseresultlayer": "GPFeatureRecordSetLayer"
    },
  "summarizenearby": {
      "resultlayer": "GPFeatureRecordSetLayer",
      "groupbysummary": "GPRecordSet"
    },
  "summarizewithin": {
      "resultlayer": "GPFeatureRecordSetLayer",
      "groupbysummary": "GPRecordSet"
    },
  "tracedownstream": {
      "tracelayer": "GPFeatureRecordSetLayer"
    }
};
