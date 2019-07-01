/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      console.log(i, j);
      if (nums[i] + nums[j] === target) {
        return [i, j];
      }
    }
  }
};
var twoSum = function(nums, target) {
  const map = {};
  for (let i = 0; i < nums.length; i++) {
    const currentValue=nums[i];
    const targetIndex=map[target-currentValue];
    map[currentValue]=i;
    if(typeof targetIndex==="number"){
      return [i,targetIndex]
    }
  }
};

const result = twoSum([1, 212, 12, 34, 45, 2], 3);

console.log(result);
