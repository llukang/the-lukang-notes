import get from 'lodash/get';
import has from 'lodash/has';
import set from 'lodash/set';
import {
  flatFieldNames,
  getErrorStrs,
  getNameIfNested,
  getVirtualPaths,
} from './utils';

const atom = {};

class FieldsStore {
  constructor(fields) {
    this.fields = fields;
    this.fieldsMeta = {};
  }
  replaceFields(fields) {
    this.fields = fields;
  }

  setFields(fields) {
    const fieldsMeta = this.fieldsMeta;
    const nowFields = {
      ...this.fields,
      ...fields,
    };
    const nowValues = {};
    Object.keys(fieldsMeta).forEach((f) => {

      const { name, isNested } = getNameIfNested(f);

      // 是否为嵌套结构
      if (isNested && fieldsMeta[name].exclusive) {
        return;
      }

      nowValues[f] = this.getValueFromFields(f, nowFields);

    });

    Object.keys(nowValues).forEach((f) => {
      const value = nowValues[f];
      const fieldMeta = fieldsMeta[f];
      if (fieldMeta && fieldMeta.normalize) {
        const nowValue =
          fieldMeta.normalize(value, this.getValueFromFields(f, this.fields), nowValues);
        if (nowValue !== value) {
          nowFields[f] = {
            ...nowFields[f],
            value: nowValue,
          };
        }
      }
    });
    this.fields = nowFields;
  }

  resetFields(ns) {
    const newFields = {};
    const { fields } = this;
    const names = ns || Object.keys(fields);
    names.forEach((name) => {
      const field = fields[name];
      if (field && 'value' in field) {
        newFields[name] = {};
      }
    });
    return newFields;
  }

  // 获取表单项的值this.fields[name].value或者this.fieldsMeta[name].initialValue
  getValueFromFieldsInternal(name, fields) {
    const field = fields[name];
    if (field && 'value' in field) {
      return field.value;
    }
    const fieldMeta = this.fieldsMeta[name];
    return fieldMeta && fieldMeta.initialValue;
  }

  // 获取表单项的值this.fields[name].value或者this.fieldsMeta[name].initialValue
  // 特别当name为嵌套结构的父键如"pKey"时，获取该父键下所有子嵌套表单项如pKey.childKey1、pKey.childKey2的值
  getValueFromFields(name, fields) {
    const { fieldsMeta } = this;

    // 处理多值情况
    if (fieldsMeta[name] && fieldsMeta[name].virtual) {
      const ret = {};
      Object.keys(fieldsMeta).forEach(fieldKey => {
        const nameIfNested = getNameIfNested(fieldKey);
        if (nameIfNested.name === name && nameIfNested.isNested) {
          set(ret, fieldKey, this.getValueFromFieldsInternal(fieldKey, fields));
        }
      });
      return ret[name];
    }
    
    return this.getValueFromFieldsInternal(name, fields);
  }

  // 获取所有表单项的name，getFieldProps(name,{exclusive:true})中exclusive设为真值的除外
  getValidFieldsName() {
    const fieldsMeta = this.fieldsMeta;
    return fieldsMeta ?
      Object.keys(fieldsMeta).filter(name => !fieldsMeta[name].hidden) :
      [];
  }

  // 获取字段值
  getFieldValuePropValue(fieldMeta) {
    // getValueProps 自定义处理函数
    const { exclusive, leadingName, name, getValueProps, valuePropName } = fieldMeta;
    const { fieldsMeta } = this;

    // 是否允许多个值
    const field = exclusive ? this.getField(leadingName) : this.getField(name);
    let fieldValue = atom;
    if (field && 'value' in field) {
      fieldValue = field.value;
    }
    if (fieldValue === atom) {
      fieldValue = exclusive ? fieldsMeta[leadingName].initialValue : fieldMeta.initialValue;
    }
    if (getValueProps) {
      
      // 用户自定义 value 处理
      return getValueProps(fieldValue);
    }
    return { [valuePropName]: fieldValue };
  }


  getField(name) {
    return {
      ...this.fields[name],
      name,
    };
  }

  getFieldMember(name, member) {
    return this.getField(name)[member];
  }

  getFieldsValue = (names) => {
    const fields = names || flatFieldNames(this.getValidFieldsName());
    const allValues = {};

    fields.forEach((f) => {
      set(allValues, f, this.getFieldValue(f));
    });
    return allValues;
  }

  getFieldValue = (name) => {
    const { fields } = this;
    return this.getValueFromFields(name, fields);
  }

  getFieldsError = (names) => {
    const fields = names || flatFieldNames(this.getValidFieldsName());
    const allErrors = {};
    fields.forEach((f) => {
      set(allErrors, f, this.getFieldError(f));
    });
    return allErrors;
  }

  getFieldError = (name) => {
    return getErrorStrs(this.getFieldMember(name, 'errors'));
  }

  getFieldMeta(name) {
    if (!this.fieldsMeta[name]) {
      this.fieldsMeta[name] = {};
    }
    return this.fieldsMeta[name];
  }

  // 设置字段相关信息
  setFieldMeta(name, meta) {
    this.fieldsMeta[name] = meta;
  }

  setFieldsInitialValue = (initialValues) => {
    const fieldsMeta = this.fieldsMeta;
    const virtualPaths = getVirtualPaths(fieldsMeta);
    Object.keys(initialValues).forEach(name => {
      if (fieldsMeta[name] && fieldsMeta[name].virtual) {
        for (let i = 0, len = virtualPaths[name].length; i < len; i++) {
          const path = virtualPaths[name][i];
          if (has(initialValues, path)) {
            fieldsMeta[path] = {
              ...fieldsMeta[path],
              initialValue: get(initialValues, path),
            };
          }
        }
      } else if (fieldsMeta[name]) {
        fieldsMeta[name] = {
          ...fieldsMeta[name],
          initialValue: initialValues[name],
        };
      }
    });
  }

  // 判断表单项是否在校验过程中
  isFieldValidating = (name) => {
    return this.getFieldMember(name, 'validating');
  }

  // 判断表单中是否有某个表单项在校验过程中
  isFieldsValidating = (ns) => {
    const names = ns || this.getValidFieldsName();
    return names.some((n) => {
      return this.isFieldValidating(n);
    });
  }

  isFieldTouched = (name) => {
    return this.getFieldMember(name, 'touched');
  }

  isFieldsTouched = (ns) => {
    const names = ns || this.getValidFieldsName();
    return names.some((n) => {
      return this.isFieldTouched(n);
    });
  }

  clearField(name) {
    delete this.fields[name];
    delete this.fieldsMeta[name];
  }
}

export default function createFieldsStore(fields) {
  return new FieldsStore(fields);
}
