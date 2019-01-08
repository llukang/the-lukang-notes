import createBaseForm from './createBaseForm';

export const mixin = {
  getForm() {
    return {
      // 获取一组输入控件的值
      getFieldsValue: this.fieldsStore.getFieldsValue,
      getFieldValue: this.fieldsStore.getFieldValue,

      getFieldInstance: this.getFieldInstance,

      // 设置一组输入控件的值
      setFieldsValue: this.setFieldsValue,

      // 设置一组输入控件的值与 Error
      setFields: this.setFields,
      
      setFieldsInitialValue: this.fieldsStore.setFieldsInitialValue,

      // 用于和表单进行双向绑定
      getFieldDecorator: this.getFieldDecorator,

      getFieldProps: this.getFieldProps,

      // 获取一组输入控件的 Error 
      getFieldsError: this.fieldsStore.getFieldsError,
      getFieldError: this.fieldsStore.getFieldError,

      // 判断一个输入控件是否在校验状态
      isFieldValidating: this.fieldsStore.isFieldValidating,
      isFieldsValidating: this.fieldsStore.isFieldsValidating,

      // 判断是否任一输入控件经历过 
      isFieldsTouched: this.fieldsStore.isFieldsTouched,
      isFieldTouched: this.fieldsStore.isFieldTouched,

      isSubmitting: this.isSubmitting,
      submit: this.submit,

      // 校验并获取一组输入域的值与 Error，若 fieldNames 参数为空，则校验全部组件
      validateFields: this.validateFields,

      // 重置一组输入控件的值（为 initialValue）与状态，如不传入参数，则重置所有组件
      resetFields: this.resetFields,
    };
  },
};

function createForm(options) {
  return createBaseForm(options, [mixin]);
}

export default createForm;
