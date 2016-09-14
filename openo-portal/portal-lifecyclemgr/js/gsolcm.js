/*
 * Copyright (C) 2015 ZTE, Inc. and others. All rights reserved. (ZTE)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var templateParameters = {
  templateName: '',
  parameters: []
};
var lcmHandler = function(){
  this._addOwnEvents();
};

lcmHandler.prototype = {
  _addOwnEvents : function () {
    $('a[data-toggle="tab"]').on('show.bs.tab', this.beforeParameterTabShow);
    $('#createNS').click(this.okAction);
  },
  beforeParameterTabShow : function (event) {
    renderTemplateParametersTab();
  },
  okAction : function (event) {
    var serviceInstance = {
      serviceTemplateId: $('#svcTempl').val(),
      serviceName: $('#svcName').val(),
      serviceDescription: $('#svcDesc').val(),
      serviceParameters: collectServiceParameters(templateParameters)
    }
    var s1ServiceUrl = '/openoapi/servicegateway/v1/services';
    var serviceTemplate = fetchServiceTemplateBy(serviceInstance.serviceTemplateId);
    if(serviceTemplate === undefined) {
      return;
    }
    if(serviceTemplate.csarType === 'GSAR') {
      serviceInstance.serviceInstanceId = createGsoServiceInstance(s1ServiceUrl, serviceInstance);
    }else if(serviceTemplate.csarType === 'NSAR' || serviceTemplate.csarType === 'NFAR') {
      serviceInstance.serviceInstanceId = createNfvoServiceInstance(s1ServiceUrl, serviceInstance);
    }else if(serviceTemplate.csarType === 'SSAR') {
      serviceInstance.serviceInstanceId = createSdnoServiceInstance(s1ServiceUrl, serviceInstance);
    }
  }
};

function collectServiceParameters(parameters) {
  var serviceParameters = {};
  var i;
  for( i = 0; i < parameters.length; i += 1) {
    serviceParameters[parameters.name] = $('#' + parameters[i].id).val();
  }
  return serviceParameters;
}

function fetchServiceTemplateBy(templateId) {
    var serviceTemplateUri = '/openoapi/catalog/v1/servicetemplates/'+ templateId;
    var template;
    $.ajax({
        type : "GET",
        async: false,
        url : serviceTemplateUri,
        contentType : "application/json",
        dataType : "json",
        success : function(jsonResp) {
            template = {
                name: jsonResp.templateName,
                gsarId: jsonResp.csarId
            }
        },
        error : function(xhr, ajaxOptions, thrownError) {
            alert("Error on page : " + xhr.responseText);
        }
    });
    if(template === undefined) {
        return template;
    }
    var queryCsarUri = '/openoapi/catalog/v1/csars/' + template.gsarId;
    $.ajax({
        type : "GET",
        async: false,
        url : queryCsarUri,
        contentType : "application/json",
        dataType : "json",
        success : function(jsonResp) {
            template.csarType = jsonResp.type
        },
        error : function(xhr, ajaxOptions, thrownError) {
            alert("Error on page : " + xhr.responseText);
        }
    });
    return template;
}

function renderTemplateParametersTab() {
  templateParameters = fetchTemplateParameterDefinitions(templateParameters);
  var components = transfromToComponents(templateParameters.parameters);
  document.getElementById("parameterTab").innerHTML = components;
}

function fetchTemplateParameterDefinitions(parameters) {
  var serviceTemplate = parameters.templateName;
  var currentServiceTemplate = $("#svcTempl").val();
  // Do not need to fetch template parameters if template do not change in UI.
  if(serviceTemplate === currentServiceTemplate) {
    return;
  }
  var queryParametersUri = '/openoapi/catalog/v1/servicetemplates/' + currentServiceTemplate + '/parameters';
  var inputParameters = [];
  $.ajax({
    type : "GET",
    async: false,
    url : queryParametersUri,
    contentType : "application/json",
    dataType : "json",
    success : function(jsonResp) {
      var inputs = jsonResp.inputs;
      var i;
      for( i = 0; i < inputs.length; i += 1) {
        inputParameters[i] = {
          name: inputs[i].name,
          type: inputs[i].type,
          description: inputs[i].description,
          defaultValue: inputs[i].defaultValue,
          required: inputs[i].required,
          id: 'parameter_' + i,
          value: inputs[i].defaultValue
        };
      }
    },
    error : function(xhr, ajaxOptions, thrownError) {
      alert("Error on page : " + xhr.responseText);
    }
  });
  return { name: currentServiceTemplate, parameters: inputParameters };
}

function transfromToComponents(parameters) {
  var components = '';
  var i;
  for( i = 0; i < parameters.length; i += 1) {
    var component = '<div class="form-group">' +
        '<label class="col-sm-3 control-label">' +
            '<span>' + parameters[i].description + '</span>'+
            generateRequiredLabel(parameters[i]) +
        '</label>' +
        '<div class="col-sm-7">' +
            '<input type="text" id="'+ parameters[i].id +'" name="parameter description" class="form-control" placeholder="' +
                parameters[i].description + '" value="'+ parameters[i].value +'" />' +
       '</div></div>';

       components = components + component;
   }
   return components;
}

function generateRequiredLabel(parameter) {
  var requiredLabel = '';
  if(parameter.required === 'true') {
    requiredLabel = '<span class="required">*</span>';
  }
  return requiredLabel;
}

function createGsoServiceInstance(s1ServiceUrl, serviceInstance) {
    var gsoLcmUri = '/openoapi/lifecyclemgr/v1/services';
    var parameter = {
        'name': serviceInstance.serviceName,
        'description': serviceInstance.serviceDescription,
        'serviceDefId': serviceTemplate.gsarId,
        'templatedId': serviceInstance.serviceTemplateId,
        'templateName': serviceTemplate.templateName,
        'getewayUri': gsoLcmUrl,
        'parameters': serviceInstance.serviceParameters
    };
    var serviceInstanceId;
    $.ajax({
        type : "POST",
        async: false,
        url : s1ServiceUrl,
        contentType : "application/json",
        dataType : "json",
        data : JSON.stringify(parameter),
        success : function(jsonResp) {
            if(jsonResp.result.errorCode != '200') {
                alert("Create service instance Error!");
                return;
            }
            serviceInstanceId = jsonResp.serviceId;
        },
        error : function(xhr, ajaxOptions, thrownError) {
            alert("Error on page : " + xhr.responseText);
        }
    });
    return serviceInstanceId;
}

function createNfvoServiceInstance(s1ServiceUrl, serviceInstance) {
    var nfvoLcmNsUrl = '/openoapi/nslcm/v1.0/ns';
    createServiceInstance(s1ServiceUrl, nfvoLcmNsUrl, serviceInstance);
}

function createServiceInstance(s1ServiceUrl, gatewayUri, serviceInstance) {
    var nsInstanceId = createNetworkService(s1ServiceUrl, gatewayUri, serviceInstance);
    if(nsInstanceId === undefined) {
        return;
    }
    instantiateNetworkService(gatewayUri, nsInstanceId, serviceInstance);
}

function createNetworkService(s1ServiceUrl, gatewayUri, serviceInstance) {
    var parameter = {
        'nsdId': serviceInstance.serviceTemplateId,
        'nsName': serviceInstance.serviceName,
        'description': serviceInstance.serviceDescription,
        'gatewayUri': gatewayUri,
        'parameters': serviceInstance.serviceParameters
    };
    var nsInstanceId;
    $.ajax({
        type : "POST",
        async: false,
        url : s1ServiceUrl,
        contentType : "application/json",
        dataType : "json",
        data : JSON.stringify(parameter),
        success : function(jsonResp) {
            nsInstanceId = jsonResp.nsInstanceId;
        },
        error : function(xhr, ajaxOptions, thrownError) {
            alert("Error on page : " + xhr.responseText);
        }
    });
    return nsInstanceId;
}

function instantiateNetworkService(gatewayUri, nsInstanceId, serviceInstance) {
    var initNsUrl = gatewayUri + '/' + nsInstanceId + '/Instantiate'
    var parameter = {
        'gatewayUri': initNsUrl,
        'nsInstanceId': nsInstanceId,
        'additionalParamForNs': serviceInstance.serviceParameters
    };
    var result = false;
    $.ajax({
        type : "POST",
        async: false,
        url : s1ServiceUrl,
        contentType : "application/json",
        dataType : "json",
        data : JSON.stringify(parameter),
        success : function(jsonResp) {
            result = true;
        },
        error : function(xhr, ajaxOptions, thrownError) {
            alert("Error on page : " + xhr.responseText);
        }
    });
    return result;
}

function createSdnoServiceInstance(s1ServiceUrl, serviceInstance) {
    var sdnoLcmNsUrl = '/openoapi/sdnonslcm/v1.0/ns';
    createServiceInstance(s1ServiceUrl, sdnoLcmNsUrl, serviceInstance);
}
