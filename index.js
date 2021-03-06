function seperate_arr() {
	const result_arr = [];
	let result_obj = {};

	for (let i of arguments) {
		if (i instanceof Object) {
			if (i instanceof Array) {
				[str, obj] = seperate_arr(...i);
				result_arr.push(...str);
				result_obj = { ...result_obj, ...obj };
			} else result_obj = { ...result_obj, ...i };
		} else {
			let temp = i;
			if (typeof i !== "number") temp = i.toString();
			result_arr.push(temp);
		}
	}

	return [result_arr, result_obj];
}

function split_obj(str) {
	return str.split(/[\[\].]+/g);
}

function process_string(string, isIkey, str, obj = {}) {
	let counter = 0;
	let isOpen = false;
	let isEsacpe = false;
	let result = "";
	let key = "";
	let isUnused = false;
	let i;
	const indexes = [];
	const unused = [];

	for (i = 0; i < string.length; i++) {
		// Checks for the esacpe pattern, ie {{ and }}
		if ((string[i] === "{" && string[i + 1] === "{") || (string[i] === "}" && string[i + 1] === "}")) {
			isEsacpe = true;
			if (isIkey) result += string[i];
			continue;
		}

		// Checks for the opening bracket and it is not a part of escape patterm.
		if (string[i] === "{" && !isEsacpe) {
			if (isOpen) throw new Error("Cannot open a bracket without closing another.");
			isOpen = true;
			continue;
		}

		//Checks for the closing bracket and if it is closed or not and updates the string.
		if (string[i] === "}" && !isEsacpe) {
			if (!isOpen) throw new Error("Cannot close a bracket without opening it.");

			key = key.trim();

			// If key is an index, then place the content from str array to here.
			const isNum = /^\d+$/.test(key);
			if (isNum) {
				const num = parseInt(key);
				if (num < str.length && isIkey) {
					result += str[num];
					indexes.push(num);
				} else {
					const placeholder = num >= str.length && isIkey ? num - str.length : num;
					const res = "{" + placeholder + "}";
					if (isIkey) {
						unused.push({
							unused: res,
							index: result.length,
						});
					}

					result += res;
					isUnused = true;
				}
			} else {
				// This checks whether the string key is a comment or not.
				const isComment = key.startsWith("~") && key.endsWith("~");

				// If key is not empty and is not a commant then it will be the key from the obj.
				if (key !== "" && !isComment) {
					const objsplit = split_obj(key);

					let objtemp = obj;
					let hasKey = true;
					for (let i of objsplit) {
						if (i !== "") {
							if (objtemp[i]) objtemp = objtemp[i];
							else {
								hasKey = false;
								break;
							}
						}
					}

					if (hasKey) result += objtemp;
					else {
						const res = "{" + key + "}";
						if (isIkey) {
							unused.push({
								unused: res,
								index: result.length,
							});
						}

						result += res;
						isUnused = true;
					}
				} else {
					//Here we will treat comments as empty brackets and if the value is not found, maintain the comment.
					if (!isIkey && counter < str.length) result += str[counter++];
					else {
						const res = "{" + key + "}";
						if (!isIkey) {
							unused.push({
								unused: res,
								index: result.length,
							});
						}
						isUnused = isIkey && !isUnused ? false : true;
						result += res;
					}
				}
			}
			key = "";
			isOpen = false;
			continue;
		}
		isEsacpe = false;
		if (!isOpen) result += string[i];
		else key += string[i];
	}

	indexes.sort((a, b) => b - a);
	for (let i of indexes) {
		str.splice(i, 1);
	}

	return [result, isUnused, unused];
}

function str_temp() {
	const string = arguments[0].toString();
	const variables = [...arguments].slice(1);

	const [str, obj] = seperate_arr(...variables);

	const [result_ik, isUnused_ik, unused_ik] = process_string(string, true, str, obj);
	const [result, isUnused, unused] = process_string(result_ik, false, str);

	if (!(isUnused || isUnused_ik)) {
		return result;
	} else {
		const anonymous = function () {
			return str_temp(result, ...arguments);
		};
		anonymous.string = result;
		anonymous.unused = [...unused, ...unused_ik].sort((a, b) => a.index - b.index);
		return anonymous;
	}
}

module.exports = str_temp;
