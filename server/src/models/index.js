const { isInMemoryActive } = require('../config/db');
const { getInMemoryCollection } = require('../config/inMemoryDB');

const UserModel = require('./User');
const StudentModel = require('./Student');
const AttendanceModel = require('./Attendance');
const GradeModel = require('./Grade');
const LMSActivityModel = require('./LMSActivity');
const RiskScoreModel = require('./RiskScore');
const AlertModel = require('./Alert');
const InterventionModel = require('./Intervention');
const ModelMetaModel = require('./ModelMeta');
const SystemConfigModel = require('./SystemConfig');

function createModelProxy(name, RealMongooseModel) {
  return new Proxy(RealMongooseModel, {
    get(target, prop, receiver) {
      if (isInMemoryActive()) {
        const mem = getInMemoryCollection(name);
        if (prop in mem || typeof mem[prop] === 'function') {
          return typeof mem[prop] === 'function' ? mem[prop].bind(mem) : mem[prop];
        }
        // Fallback for statics on target
        if (prop in target) {
          return Reflect.get(target, prop, receiver);
        }
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

const User = createModelProxy('User', UserModel);
const Student = createModelProxy('Student', StudentModel);
const Attendance = createModelProxy('Attendance', AttendanceModel);
const Grade = createModelProxy('Grade', GradeModel);
const LMSActivity = createModelProxy('LMSActivity', LMSActivityModel);
const RiskScore = createModelProxy('RiskScore', RiskScoreModel);
const Alert = createModelProxy('Alert', AlertModel);
const Intervention = createModelProxy('Intervention', InterventionModel);
const ModelMeta = createModelProxy('ModelMeta', ModelMetaModel);
const SystemConfig = createModelProxy('SystemConfig', SystemConfigModel);

module.exports = {
  User,
  Student,
  Attendance,
  Grade,
  LMSActivity,
  RiskScore,
  Alert,
  Intervention,
  ModelMeta,
  SystemConfig,
};
