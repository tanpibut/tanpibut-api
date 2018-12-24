module.exports = function(router) {
    var tpb = require('../controllers/tanpibut.controller');

    var area = require('../controllers/area.controller');
    var kendo = require('../controllers/area.kendo.controller');

    var station = require('../controllers/station.controller');

    var dataType = require('../controllers/data_type.controller');

    var observe = require('../controllers/observation.controller');

    var health = require('../controllers/health.controller');

    var dataSource = require('../controllers/data_source.controller');

    router.get('/', tpb.render);
    router.get('/user', tpb.user);
    router.get('/area', area.area);
    router.get('/area/boundary', area.boundary);
    router.get('/kendo/area', kendo.area);

    router.get('/station', station.station);

    router.get('/data_type', dataType.getDataType);
    router.get('/local_cri', dataType.getLocalCriteria);

    router.get('/observation', observe.getObservation);
    router.get('/observation_h', observe.getObservationHistory);

    router.get('/health', health.getHealth)

    router.get('/data_source', dataSource.getDataSource)
    return router;
}