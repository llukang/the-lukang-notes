import React from 'react';
import createReactClass from 'create-react-class';
import AsyncValidator from 'async-validator';
import warning from 'warning';
import get from 'lodash/get';
import has from 'lodash/has';
import set from 'lodash/set';
import createFieldsStore from './createFieldsStore';
import {
  argumentContainer,
  mirror,
  getValueFromEvent,
  hasRules,
  getParams,
  isEmptyObject,
  flattenArray,
  getNameIfNested,
  flatFieldNames,
  clearVirtualField,
  getVirtualPaths,
  normalizeValidateRules,
} from './utils';

const DEFAULT_TRIGGER = 'onChange';

function createBaseForm(option = {}, mixins = []) {
  const {
    mapPropsToFields, // 页面初始化或重绘时，将组件接受到的props转变为表单项数据注入this.fields中  
    onFieldsChange,
    onValuesChange,
    fieldNameProp, // 设置表单项存储name的键
    fieldMetaProp,  // 用于getFieldProps添加的数据转化后挂载到元素的props，提供键  
    validateMessages,
    mapProps = mirror, // 对被包装组件的props 进行处理
    formPropName = 'form',
    withRef, //维护包装组件实例的参考，用于refs.wrappedComponent访问。已弃用，推荐wrappedComponentRef
  } = option;

  function decorate(WrappedComponent) {
    const Form = createReactClass({
      // getForm
      mixins,

      getInitialState() {
        const fields = mapPropsToFields && mapPropsToFields(this.props);

        //存储表单数据
        this.fieldsStore = createFieldsStore(fields || {});


        this.instances = {};

        // 存储绑定在表单项上的相关事件：onChange、onChangeValidate、以及删除数据相关this.saveRef方法  
        this.cachedBind = {};

        ['getFieldsValue',
          'getFieldValue',
          'setFieldsInitialValue',
          'getFieldsError',
          'getFieldError',
          'isFieldValidating',
          'isFieldsValidating',
          'isFieldsTouched',
          'isFieldTouched'].forEach(key => this[key] = (...args) => {
            return this.fieldsStore[key](...args);
          });

        return {
          submitting: false,
        };
      },

      componentWillReceiveProps(nextProps) {
        if (mapPropsToFields) {
          this.fieldsStore.replaceFields(mapPropsToFields(nextProps));
        }
      },

      onCollectCommon(name_, action, args) {
        let name = name_;
        const fieldMeta = this.fieldsStore.getFieldMeta(name);

        // 处理原来的onChange事件
        if (fieldMeta[action]) {
          fieldMeta[action](...args);
        } else if (fieldMeta.originalProps && fieldMeta.originalProps[action]) {
          fieldMeta.originalProps[action](...args);
        }

        // 自定义获取表单值
        const value = fieldMeta.getValueFromEvent ?
          fieldMeta.getValueFromEvent(...args) :
          getValueFromEvent(...args);

        // 调用 表单全局 onValuesChange 事件
        if (onValuesChange && value !== this.fieldsStore.getFieldValue(name)) {
          onValuesChange(this.props, set({}, name, value));
        }

        // 嵌套关系处理 { leadingname: str,  isNested: bool, }
        const nameKeyObj = getNameIfNested(name);

        // 嵌套关系 多个值
        if (this.fieldsStore.getFieldMeta(nameKeyObj.name).exclusive) {
          name = nameKeyObj.name;
        }

        const field = this.fieldsStore.getField(name);
        return ({ name, field: { ...field, value, touched: true }, fieldMeta });
      },

      onCollect(name_, action, ...args) {

        const { name, field, fieldMeta } = this.onCollectCommon(name_, action, args);

        const { validate } = fieldMeta;
        const fieldContent = {
          ...field,
          dirty: hasRules(validate),
        };
        this.setFields({
          [name]: fieldContent,
        });
      },

      onCollectValidate(name_, action, ...args) {
        const { field, fieldMeta } = this.onCollectCommon(name_, action, args);
        const fieldContent = {
          ...field,
          dirty: true,
        };

        this.validateFieldsInternal([fieldContent], {
          action,
          options: {
            firstFields: !!fieldMeta.validateFirst,
          },
        });
      },

      // 获取&&将事件注册到 cacheBind,
      getCacheBind(name, action, fn) {
        const cache = this.cachedBind[name] = this.cachedBind[name] || {};
        if (!cache[action]) {
          cache[action] = fn.bind(this, name, action);
        }
        return cache[action];
      },

      // 初始化 表单项
      // {getFieldDecorator('name', otherOptions)(<input />)}
      getFieldDecorator(name, fieldOption) {
        // 获取表单的props

        const props = this.getFieldProps(name, fieldOption);

        // 接受 表单项组件
        return (fieldElem) => {
          const fieldMeta = this.fieldsStore.getFieldMeta(name);

          const originalProps = fieldElem.props;

          fieldMeta.originalProps = originalProps;
          fieldMeta.ref = fieldElem.ref;

          return React.cloneElement(fieldElem, {
            ...props,
            ...this.fieldsStore.getFieldValuePropValue(fieldMeta),
          });
        };
      },


      getFieldProps(name, usersFieldOption = {}) {

        // 获取字段name 并处理其嵌套关系(checkBox)，支持 name.a || name[a] => {name:name,isNested:true}
        const nameIfNested = getNameIfNested(name);
        const leadingName = nameIfNested.name;

        const fieldOption = {
          valuePropName: 'value', // value值 存储的key键
          validate: [], // 验证规则
          trigger: DEFAULT_TRIGGER, // 触发事件，默认onchange
          leadingName,
          name,
          ...usersFieldOption,
        };

        const {
          rules, // 用户自定义 rules
          trigger,
          validateTrigger = trigger, // 验证触发事件
          exclusive, // 值是否互斥(radio需传入),
          validate,
        } = fieldOption;

        // 获取对name FiledMeta的引用
        const fieldMeta = this.fieldsStore.getFieldMeta(name);

        if ('initialValue' in fieldOption) {
          fieldMeta.initialValue = fieldOption.initialValue;
        }

        // 获取对leadingName FiledMeta的引用(嵌套结构会注册两个FieldMeta);
        const leadingFieldMeta = this.fieldsStore.getFieldMeta(leadingName);

        if (nameIfNested.isNested) {
          leadingFieldMeta.virtual = !exclusive;
          // exclusive allow getFieldProps('x', {initialValue})
          // non-exclusive does not allow getFieldProps('x', {initialValue})
          leadingFieldMeta.hidden = !exclusive;
          leadingFieldMeta.exclusive = exclusive;
        }

        // 处理value与ref
        const inputProps = {
          ...this.fieldsStore.getFieldValuePropValue(fieldOption),
          ref: this.getCacheBind(name, `${name}__ref`, this.saveRef)
        };

        // 传入field Name
        if (fieldNameProp) {
          inputProps[fieldNameProp] = name;
        }

        // 两种验证规则写法，格式化rules规则 {trigger:str ,rules:[]} 
        const validateRules = normalizeValidateRules(validate, rules, validateTrigger);

        // 获取调用验证规则的所有事件，默认validateTrigger
        const validateTriggers = validateRules
          .filter(item => !!item.rules && item.rules.length)
          .map(item => item.trigger)
          .reduce((pre, curr) => pre.concat(curr), []);

        // 绑定表单验证事件
        // cacheBind {name:{onchange:function}}
        validateTriggers.forEach((action) => {
          if (inputProps[action]) return;
          inputProps[action] = this.getCacheBind(name, action, this.onCollectValidate);
        });

        // 绑定表单收集事件
        if (trigger && validateTriggers.indexOf(trigger) === -1) {
          inputProps[trigger] = this.getCacheBind(name, trigger, this.onCollect);
        }

        const meta = {
          ...fieldMeta,
          ...fieldOption,
          validate: validateRules,
        };

        // 保存字段相关信息
        this.fieldsStore.setFieldMeta(name, meta);

        // 表单项挂载 meta 数据
        if (fieldMetaProp) {
          inputProps[fieldMetaProp] = meta;
        }

        return inputProps;
      },

      getFieldInstance(name) {
        return this.instances[name];
      },

      getRules(fieldMeta, action) {
        const actionRules = fieldMeta.validate.filter((item) => {
          return !action || item.trigger.indexOf(action) >= 0;
        }).map((item) => item.rules);
        return flattenArray(actionRules);
      },

      // this.fields重新赋值，并调用this.forceUpdate重绘页面
      setFields(fields) {
        this.fieldsStore.setFields(fields);
        if (onFieldsChange) {
          const changedFields = {};
          Object.keys(fields).forEach((f) => {
            changedFields[f] = this.fieldsStore.getField(f);
          });
          onFieldsChange(this.props, changedFields);
        }
        this.forceUpdate();
      },

      resetFields(ns) {
        const newFields = this.fieldsStore.resetFields(ns);
        if (Object.keys(newFields).length > 0) {
          this.setFields(newFields);
        }
      },

      setFieldsValue(fieldsValue) {
        if (onValuesChange) {
          onValuesChange(this.props, fieldsValue);
        }
        const newFields = {};
        const { fieldsMeta, fields } = this.fieldsStore;
        const virtualPaths = getVirtualPaths(fieldsMeta);
        Object.keys(fieldsValue).forEach((name) => {
          const value = fieldsValue[name];
          if (fieldsMeta[name] && fieldsMeta[name].virtual) {
            clearVirtualField(name, fields, fieldsMeta);
            for (let i = 0, len = virtualPaths[name].length; i < len; i++) {
              const path = virtualPaths[name][i];
              if (has(fieldsValue, path)) {
                newFields[path] = {
                  name: path,
                  value: get(fieldsValue, path),
                };
              }
            }
          } else if (fieldsMeta[name]) {
            newFields[name] = {
              name,
              value,
            };
          } else {
            warning(
              false,
              'Cannot use `setFieldsValue` until ' +
              'you use `getFieldDecorator` or `getFieldProps` to register it.'
            );
          }
        });
        this.setFields(newFields);
      },

      // 通过组件实例ref属性回调函函数，添加实例到instances
      saveRef(name, _, component) {
        if (!component) {
          // after destroy, delete data
          this.fieldsStore.clearField(name);
          delete this.instances[name];
          delete this.cachedBind[name];
          return;
        }
        const fieldMeta = this.fieldsStore.getFieldMeta(name);
        if (fieldMeta) {
          const ref = fieldMeta.ref;
          if (ref) {
            if (typeof ref === 'string') {
              throw new Error(`can not set ref string for ${name}`);
            }
            ref(component);
          }
        }
        this.instances[name] = component;
      },

      // 验证输入是否合法
      // 参数fields为数组形式待校验的表单项
      validateFieldsInternal(fields, {
        fieldNames,
        action,
        options = {},
      }, callback) {

        const allRules = {};
        const allValues = {};
        const allFields = {};
        const alreadyErrors = {};

        // 更新字段的状态（error,验证中，未验证）
        fields.forEach((field) => {
          const name = field.name;
          // options.force强制对表单项作校验，即便field.dirty为false，指示校验完成
          if (options.force !== true && field.dirty === false) {
            if (field.errors) {
              set(alreadyErrors, name, { errors: field.errors });
            }
            return;
          }
          const fieldMeta = this.fieldsStore.getFieldMeta(name);
          const newField = {
            ...field,
          };
          newField.errors = undefined; //清空过去的errors 信息
          newField.validating = true; // 更新状态为验证中
          newField.dirty = true; // 未验证
          allRules[name] = this.getRules(fieldMeta, action); // 组装AsyncValidator验证规则
          allValues[name] = newField.value; // 组装AsyncValidator验证值
          allFields[name] = newField; // 所有需要验证字段
        });

        // 更新 fields 与组件
        this.setFields(allFields);

        // 获取表单项的值
        Object.keys(allValues).forEach((f) => {
          allValues[f] = this.fieldsStore.getFieldValue(f);
        });

        // 字段不存在，直接返回
        if (callback && isEmptyObject(allFields)) {
          callback(isEmptyObject(alreadyErrors) ? null : alreadyErrors,
            this.fieldsStore.getFieldsValue(flatFieldNames(fieldNames)));
          return;
        }

        // 注册 AsyncValidator 验证规则
        const validator = new AsyncValidator(allRules);

        // 注册 全局message信息
        if (validateMessages) {
          validator.messages(validateMessages);
        }

        // 调用验证
        validator.validate(allValues, options, (errors) => {
          const errorsGroup = {
            ...alreadyErrors,
          };

          if (errors && errors.length) {
            errors.forEach((e) => {
              const fieldName = e.field;
              if (!has(errorsGroup, fieldName)) {
                set(errorsGroup, fieldName, { errors: [] });
              }
              const fieldErrors = get(errorsGroup, fieldName.concat('.errors'));
              fieldErrors.push(e);
            });
          }

          const expired = [];
          const nowAllFields = {};


          // 更新字段相关信息 刷新页面
          Object.keys(allRules).forEach((name) => {
            const fieldErrors = get(errorsGroup, name);
            const nowField = this.fieldsStore.getField(name);
            // avoid concurrency problems
            if (nowField.value !== allValues[name]) {
              expired.push({
                name,
              });
            } else {
              nowField.errors = fieldErrors && fieldErrors.errors;
              nowField.value = allValues[name];
              nowField.validating = false;
              nowField.dirty = false;
              nowAllFields[name] = nowField;
            }
          });

          this.setFields(nowAllFields);

          // callback(errors,values)根据fields设置值完成及校验完成后执行的回调函数
          if (callback) {
            if (expired.length) {
              expired.forEach(({ name }) => {
                const fieldErrors = [{
                  message: `${name} need to revalidate`,
                  field: name,
                }];
                set(errorsGroup, name, {
                  expired: true,
                  errors: fieldErrors,
                });
              });
            }

            callback(isEmptyObject(errorsGroup) ? null : errorsGroup,
              this.fieldsStore.getFieldsValue(flatFieldNames(fieldNames)));
          }
        });
      },

      validateFields(ns, opt, cb) {
        // 处理入参
        const { names, callback, options } = getParams(ns, opt, cb);
        const fieldNames = names || this.fieldsStore.getValidFieldsName();

        // 获取有验证规则的表单项
        const fields = fieldNames
          .filter(name => {
            const fieldMeta = this.fieldsStore.getFieldMeta(name);
            return hasRules(fieldMeta.validate);
          }).map((name) => {
            const field = this.fieldsStore.getField(name);
            field.value = this.fieldsStore.getFieldValue(name);
            return field;
          });


        if (!fields.length) {
          if (callback) {
            callback(null, this.fieldsStore.getFieldsValue(flatFieldNames(fieldNames)));
          }
          return;
        }

        // 指定表单域会在碰到第一个失败了的校验规则后停止校验
        if (!('firstFields' in options)) {
          options.firstFields = fieldNames.filter((name) => {
            const fieldMeta = this.fieldsStore.getFieldMeta(name);
            return !!fieldMeta.validateFirst;
          });
        }

        this.validateFieldsInternal(fields, {
          fieldNames,
          options,
        }, callback);
      },

      // 判断表单的提交状态submitting
      isSubmitting() {
        return this.state.submitting;
      },

      // 表单提交
      submit(callback) {
        const fn = () => {
          this.setState({
            submitting: false,
          });
        };
        this.setState({
          submitting: true,
        });
        callback(fn);
      },

      render() {

        const { wrappedComponentRef, ...restProps } = this.props;

        // 将方法写入 this.props.form
        const formProps = {
          [formPropName]: this.getForm(),
        };


        function innerestWrappedComponentRef(...args) {
          if (wrappedComponentRef && !innerestWrappedComponentRef.called) {
            wrappedComponentRef(...args);
            innerestWrappedComponentRef.called = true;
          }
        }
        // 向WrappedComponent组件添加ref属性
        if (withRef) {
          formProps.ref = 'wrappedComponent';
        }
        // wrappedComponentRef 获取被包装组件的ref
        if (wrappedComponentRef) {
          formProps.ref = innerestWrappedComponentRef;
        }

        // mapProps对被包装组件的props 进行处理
        const props = mapProps.call(this, {
          ...formProps,
          ...restProps,
          wrappedComponentRef: innerestWrappedComponentRef,
        });

        return <WrappedComponent {...props} />;
      },
    });

    return argumentContainer(Form, WrappedComponent);
  }

  return decorate;
}

export default createBaseForm;
