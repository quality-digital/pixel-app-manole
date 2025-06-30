import { canUseDOM } from 'vtex.render-runtime'

import type { PixelMessage } from './typings/events'

declare global {
  interface Window {
    InsiderQueue?: any;
  }
}

function injectInsiderScript() {
  if (window.InsiderQueue) {
    const script = document.createElement('script')

    script.async = true
    script.src = 'https://manole.api.useinsider.com/ins.js?id=10012431'
    document.head.appendChild(script)
  }
}

function getPageName(input: string) {
  const parts = input.split(/[.#]/)

  if (input.includes('#')) {
    return parts[2] || null
  }

  if (input.includes('.')) {
    return parts[1] || null
  }

  return null
}

function getImageProduct(imagens: string | undefined) {
  if (!imagens) {
    return
  }
  return imagens.split('?')[0];
}
function extractCategoryNames(categories: any) {

  if (!categories) {
    return []
  }
  return categories.map((category: { name: any; }) => category.name);
}

function formatPathSegments(url: any) {

  const path = new URL(url).pathname;

  const segments = path.split('/').filter(segment => segment && segment !== '__bindingAddress');

  const formatted = segments.map(segment => {
    let formattedSegment = segment.replace(/-/g, ' ');

    formattedSegment = formattedSegment.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    if (formattedSegment === 'Cursos Na Area Da Saude') {
      return 'Curso na área da saúde';
    }

    return formattedSegment;
  });

  return formatted;
}


/*Add to CART*/

function getViewItemEvent(eventDataLayer: any, dataLayer: any) {
  for (let i = dataLayer.length - 1; i >= 0; i--) {
    if (dataLayer[i].event === eventDataLayer) {
      return dataLayer[i];
    }
  }
  return null;
}

function tratarNumero(valor: any) {
  let str = valor.toString();

  let zerosFinais = 0;
  for (let i = str.length - 1; i >= 0; i--) {
    if (str.charAt(i) === '0') {
      zerosFinais++;
    } else {
      break;
    }
  }

  if (zerosFinais >= 2) {
    str = str.substring(0, str.length - 2);
    return str;
  }

  if (zerosFinais === 1) {
    let base = str.substring(0, str.length - 1);
    if (base.length === 1) {
      return '0.' + base;
    }
    return base.substring(0, base.length - 1) + '.' + base.substring(base.length - 1);
  }

  if (str.length <= 2) {
    return '0.' + (str.length === 1 ? '0' + str : str);
  }

  return str.substring(0, str.length - 2) + '.' + str.substring(str.length - 2);
}

function getImageProductCart(imageProduct: any) {
  return imageProduct ? imageProduct.split('-')[0] : null;
}

function shipping(orderForm: any) {
  var shipping = null;
  var totalizers = orderForm.totalizers
  for (var i = 0; i < totalizers.length; i++) {
    if (totalizers[i].id === "Shipping") {
      return shipping = totalizers[i].value;
    }
    if (shipping !== null) {
      return shipping;
    } else {
      return 0
    }
  }
}
function sendEventInside(eventName: string, data: any) {
  switch (eventName) {
    case 'home': {
      window.InsiderQueue.push({
        type: 'home'
      });
      window.InsiderQueue.push({
        type: 'init'
      });
      break
    }

    case 'product': {

      let objectUser = {
        "id": data?.product?.productReference,
        "name": data?.product?.productName,
        "taxonomy": extractCategoryNames(data.product?.categoryTree),
        "unit_price": data?.product?.selectedSku?.sellers[0].commertialOffer?.Price || 0,
        "unit_sale_price": data?.product?.selectedSku?.sellers[0].commertialOffer?.PriceWithoutDiscount || 0,
        "url": data?.product?.detailUrl,
        "product_image_url": getImageProduct(data?.product?.selectedSku?.imageUrl),
        "custom": {
          "isbn": data?.product?.selectedSku?.ean,
          "ean": data?.product?.selectedSku?.ean,
          "modalidade": data?.product?.selectedSku.name
        }
      }


      window.InsiderQueue.push({
        type: 'product',
        value: objectUser
      });
      window.InsiderQueue.push({
        type: "currency",
        value: data?.currency || 'BRL'
      });
      window.InsiderQueue.push({
        type: 'init'
      });

      injectInsiderScript()
      break
    }

    case 'subcategory': {
      let formattedPaths: any = formatPathSegments(data.pageUrl);
      if (!formattedPaths || formattedPaths.length === 0) {
        return
      }
      window.InsiderQueue.push({
        type: 'category',
        value: formattedPaths
      });
      window.InsiderQueue.push({
        type: 'init'
      });

      injectInsiderScript()
      break
    }

    case 'department': {
      let formattedPaths: any = formatPathSegments(data.pageUrl);

      if (!formattedPaths || formattedPaths.length === 0) {
        return
      }
      window.InsiderQueue.push({
        type: 'category',
        value: formattedPaths
      });
      window.InsiderQueue.push({
        type: 'init'
      });

      injectInsiderScript()
      break
    }
    case 'addToCart': {

      let viewItemEvent = getViewItemEvent('add_to_cart', window.dataLayer);
      if (!viewItemEvent || !viewItemEvent.ecommerce || !viewItemEvent.ecommerce.items || !viewItemEvent.ecommerce.items.length) {
        console.warn('Product data not found in dataLayer');
      }

      let product = viewItemEvent.ecommerce.items[0];
      let arrayTaxonomy = [];

      if (product.item_category) arrayTaxonomy.push(product.item_category);
      if (product.item_category2) arrayTaxonomy.push(product.item_category2);
      if (product.item_category3) arrayTaxonomy.push(product.item_category3);

      let dataStorage: any = localStorage.getItem('imgAddToCart')
      let lStorage = JSON.parse(dataStorage) || [];
      let objectNew = {
        id: product.item_id,
        img: getImageProductCart(data.imageUrl),
        unit_sale_price: parseFloat(tratarNumero(data.sellingPrice)),
        unit_price: parseFloat(tratarNumero(data.price)),
        custom: {
          isbn: data.ean,
          ean: data.ean,
          modalidade: data.variant
        }
      };

      lStorage.push(objectNew);
      localStorage.setItem('imgAddToCart', JSON.stringify(lStorage));

      window.InsiderQueue.push({
        type: 'currency',
        value: 'BRL'
      });
      window.InsiderQueue.push({
        type: 'add_to_cart',
        value: {
          id: data.productId,
          name: data.name,
          taxonomy: arrayTaxonomy,
          unit_price: parseFloat(tratarNumero(data.price)),
          unit_sale_price: parseFloat(tratarNumero(data.sellingPrice)),
          url: window.location.href + data.detailUrl,
          quantity: data.quantity,
          product_image_url: getImageProductCart(data.imageUrl),
          custom: {
            isbn: data.ean,
            ean: data.ean,
            modalidade: data.variant
          }
        }
      });

      injectInsiderScript()
      break
    }

    case 'remove_from_cart': {

      let viewItemEvent = getViewItemEvent("remove_from_cart", window.dataLayer);

      if (!viewItemEvent || !viewItemEvent.ecommerce || !viewItemEvent.ecommerce.items || !viewItemEvent.ecommerce.items.length) {
        console.warn('Product data not found in dataLayer');
      }

      let product = viewItemEvent.ecommerce.items[0];
      let arrayTaxonomy = [];

      if (product.item_category) arrayTaxonomy.push(product.item_category);
      if (product.item_category2) arrayTaxonomy.push(product.item_category2);
      if (product.item_category3) arrayTaxonomy.push(product.item_category3);

      let storageData: any = localStorage.getItem('imgAddToCart')
      let lStorage = JSON.parse(storageData)
      let itemId = product.item_id;
      let unit_price: any = ''
      let unit_sale_price: any = ''
      let custom: any = {};
      for (var i = 0; i < lStorage.length; i++) {
        if (lStorage[i].id === itemId) {
          unit_price = lStorage[i].unit_price
          unit_sale_price = lStorage[i].unit_sale_price
          custom = lStorage[i].custom;
          break;
        }
      }

      let newStorage = [];
      for (var j = 0; j < lStorage.length; j++) {
        if (lStorage[j].id !== itemId) {
          newStorage.push(lStorage[j]);
        }
      }
      localStorage.setItem('imgAddToCart', JSON.stringify(newStorage));

      window.InsiderQueue.push({
        type: 'currency',
        value: 'BRL'
      });

      window.InsiderQueue.push({
        type: 'remove_from_cart',
        value: {
          id: data.productId,
          name: data.name,
          taxonomy: arrayTaxonomy,
          unit_price: unit_price,
          unit_sale_price: unit_sale_price,
          url: window.location.href + data.detailUrl,
          product_image_url: getImageProductCart(data.imageUrl),
          custom: custom
        }
      });

    }

    case 'viewCart': {
      let newItems: any = [];
      let dataOrderForm: any = localStorage.getItem('orderform');
      let orderForm = JSON.parse(dataOrderForm) || [];


      data.forEach((item: any) => {
        const taxonomy = item.category.split('/').map((i: any) => i.trim());
        const orderItem = orderForm.items.find((debugger: any) => d.id === item.skuId);

      if (orderItem) {
        newItems.push({
          id: item.skuId,
          name: item.name,
          taxonomy: taxonomy,
          unit_price: parseFloat(tratarNumero(orderItem.price)),
          unit_sale_price: parseFloat(tratarNumero(orderItem.sellingPrice)),
          url: window.location.hostname + item.detailUrl,
          product_image_url: item.imageUrl,
          quantity: item.quantity
        });
      }
    });

      window.InsiderQueue.push({
        type: 'cart', value: {
          "total": parseFloat(tratarNumero(orderForm.value)),
          "shipping_cost": shipping(orderForm),
          "items": newItems
        }
      });
      window.InsiderQueue.push({
        type: 'currency',
        value: 'BRL'
      });
      window.InsiderQueue.push({
        type: 'init'
      });

      break
  }

    case 'user': {

    let getInsiderQueueUse = localStorage.getItem('insiderQueue');

    if (!getInsiderQueueUse) return
    /*
    window.InsiderQueue.push({
      type: page_type === 'department' ? 'category' : page_type
    });*/
    window.InsiderQueue.push(JSON.parse(getInsiderQueueUse));
    /*
    window.InsiderQueue.push({
      type: 'init'
    });
    */
    injectInsiderScript()

    break
  }
}
}


export function handleEvents(e: PixelMessage) {
  switch (e.data.eventName) {

    case 'vtex:pageView': {
      const pageType = getPageName((e.data as any).routeId)

      switch (pageType) {
        case 'home': {
          window.InsiderQueue = window.InsiderQueue || []
          sendEventInside('home', e.data)
          break
        }
        case 'subcategory': {
          window.InsiderQueue = window.InsiderQueue || []
          sendEventInside('subcategory', e.data)
        }

        case 'department': {
          window.InsiderQueue = window.InsiderQueue || []
          sendEventInside('department', e.data)
        }
      }
      break
    }
    case 'vtex:productView': {
      window.InsiderQueue = window.InsiderQueue || []
      sendEventInside('product', e.data)
      break
    }

    case 'vtex:addToCart': {
      const { items } = e.data

      window.InsiderQueue = window.InsiderQueue || []
      sendEventInside('addToCart', items[0])

      return
    }
    case 'vtex:removeFromCart': {
      const { items } = e.data

      window.InsiderQueue = window.InsiderQueue || []
      sendEventInside('remove_from_cart', items[0])

      return
    }

    case 'vtex:cartChanged': {
      const { items } = e.data

      window.InsiderQueue = window.InsiderQueue || []
      sendEventInside('viewCart', items)
      return

    }

    case 'vtex:userData': {
      const { data } = e

      if (!data.isAuthenticated) {
        return
      }
      window.InsiderQueue = window.InsiderQueue || []

      sendEventInside('user', data)
      return
    }

    case 'vtex:orderPlaced': {
      window.InsiderQueue = window.InsiderQueue || []
      const order: any = e.data
      var localStorageData = localStorage.getItem('ObjectInsiderPurchase')
      var objectInsider = localStorageData ? JSON.parse(localStorageData) : false

      debugger
      if (objectInsider || order) {
        objectInsider.order_id = order?.ordersInOrderGroup[0];
        window.InsiderQueue.push({
          type: 'purchase', value: objectInsider
        });
        window.InsiderQueue.push({
          type: 'currency',
          value: 'BRL'
        });
      }

      break
    }
    default: {
      break
    }


  }
}

if (canUseDOM) {
  window.addEventListener('message', handleEvents)
}
